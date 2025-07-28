const app = angular.module('mapelApp', ['ui.router']);

// --- MSAL Configuration ---
const msalConfig = {
    auth: {
        clientId: "4efae7e2-009b-464a-a5c0-e2eee383cfab", // Your CIAM App Registration client ID
        authority: "https://maplebg.ciamlogin.com/maplebg.onmicrosoft.com", // CIAM tenant authority
        knownAuthorities: ["maplebg.ciamlogin.com"],
        //redirectUri: "http://localhost:8080", // Ensure this matches your registered redirect URI
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

// --- Main Controller ---
app.controller('MainController', function($scope, $rootScope) {
    const vm = this;
    vm.isAuthenticated = false;
    vm.username = '';

    function parseJwt (token) {
        if (!token) return {};
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    }

    function setDisplayNameFromIdToken(idToken) {
        var payload = parseJwt(idToken);
        $rootScope.displayName = payload.name || payload.displayName || '';
        let roles = payload.roles || payload.role || [];
        if (typeof roles === 'string') roles = [roles];
        $rootScope.userRoles = roles;
        $rootScope.idTokenJson = JSON.stringify(payload, null, 2);
        if ($scope.$applyAsync) $scope.$applyAsync();
        console.log('ID Token Payload:', payload);
    }

    const currentAccount = msalInstance.getAllAccounts()[0];
    if (currentAccount) {
        msalInstance.setActiveAccount(currentAccount);
        vm.isAuthenticated = true;
        vm.username = currentAccount.username;
        $rootScope.isAuthenticated = true;
        if (currentAccount.idToken) {
            setDisplayNameFromIdToken(currentAccount.idToken);
        }
    }
    $rootScope.hasFullAccess = function() {
        return ($rootScope.userRoles || []).some(r => r === 'Manager' || r === 'Administrator');
    };
    $rootScope.isGuest = function() {
        return ($rootScope.userRoles || []).length === 1 && $rootScope.userRoles[0] === 'Guest';
    };

    vm.login = function() {
        msalInstance.loginRedirect({ scopes: ["openid", "profile"] });
    };

    vm.logout = function() {
        msalInstance.logoutRedirect();
    };

    // Listen for login via redirect
    msalInstance.handleRedirectPromise()
        .then(function(response) {
            if (response && response.account) {
                msalInstance.setActiveAccount(response.account);
                vm.isAuthenticated = true;
                vm.username = response.account.username;
                $rootScope.isAuthenticated = true;
                if (response.idToken) {
                    setDisplayNameFromIdToken(response.idToken);
                }
                $scope.$apply();
            }
        });
    // Invitation send logic (used in invite.html)
    $scope.inviteEmail = '';
    $scope.inviteMessage = '';
    $scope.sendInvitation = async function() {
        if ($scope.inviteEmail) {
            $scope.inviteMessage = '';
            try {
                // Acquire token for API
                const request = {
                    scopes: ["api://29f30d86-f2a8-4288-928d-05f0af5629d2/.default"] // TODO: replace with your API's App ID URI scope
                };
                const tokenResponse = await msalInstance.acquireTokenSilent(request);
                const accessToken = tokenResponse.accessToken;
                // Use local API endpoint for development
                const apiBaseUrl = 'http://localhost:5004'; // Change to your prod URL when deploying
                const response = await fetch(apiBaseUrl + '/api/Notification/user-invite', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + accessToken
                    },
                    body: JSON.stringify($scope.inviteEmail)
                });
                if (response.ok) {
                    const result = await response.json();
                    $scope.inviteMessage = 'Success: ' + (typeof result === 'string' ? result : JSON.stringify(result));
                } else {
                    const err = await response.text();
                    $scope.inviteMessage = 'Error: ' + err;
                }
            } catch (e) {
                $scope.inviteMessage = 'Error: ' + (e.message || e);
            }
            $scope.inviteEmail = '';
            $scope.inviteForm.$setPristine();
            $scope.$applyAsync();
        }
    };
});

// --- Router Configuration ---
app.config(function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/home');

    $stateProvider
        .state('home', {
            url: '/home',
            templateUrl: 'home.html'
        })
        .state('manage-user', {
            url: '/manage-user',
            templateUrl: 'manage-user.html',
            data: { requiresLogin: true }
        })
        .state('report', {
            url: '/report',
            templateUrl: 'report.html',
            data: { requiresLogin: true }
        })
        .state('invite', {
            url: '/invite',
            templateUrl: 'invite.html'
        });
});

// --- Route and Redirect Handling ---
app.run(function($rootScope, $state) {
    // Handle redirect login response
    msalInstance.handleRedirectPromise()
        .then(response => {
            if (response && response.account) {
                msalInstance.setActiveAccount(response.account);
                $rootScope.account = response.account;
                $rootScope.isAuthenticated = true;
            } else {
                const accounts = msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    msalInstance.setActiveAccount(accounts[0]);
                    $rootScope.account = accounts[0];
                    $rootScope.isAuthenticated = true;
                }
            }
        })
        .catch(error => {
            console.error("MSAL redirect error:", error);
        });

    // Route protection
    $rootScope.$on('$stateChangeStart', function(event, toState) {
        const roles = $rootScope.userRoles || [];
        // Home is always accessible
        if (toState.name === 'home') {
            $rootScope.showLoginRequired = false;
            return;
        }
        // Manage User: Only Administrator
        if (toState.name === 'manage-user') {
            if (!roles.includes('Administrator')) {
                event.preventDefault();
                $rootScope.showLoginRequired = true;
                return;
            }
        }
        // Report: Administrator or Manager
        if (toState.name === 'report') {
            if (!(roles.includes('Administrator') || roles.includes('Manager'))) {
                event.preventDefault();
                $rootScope.showLoginRequired = true;
                return;
            }
        }
        // Invite: Only Administrator
        if (toState.name === 'invite') {
            if (!roles.includes('Administrator')) {
                event.preventDefault();
                $rootScope.showLoginRequired = true;
                return;
            }
        }
        // For all other states requiring login
        if (toState.data && toState.data.requiresLogin) {
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length === 0) {
                event.preventDefault();
                $rootScope.showLoginRequired = true;
                return;
            }
        }
        $rootScope.showLoginRequired = false;
    });
});
