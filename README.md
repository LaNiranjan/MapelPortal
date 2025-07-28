# AngularJS WinSurf Application

This is a web application built with AngularJS, featuring a responsive layout with a header, a collapsible sidebar, and user authentication using Azure Entra External ID.

## Prerequisites

1.  **Azure Entra External ID Tenant**:
    You need to have an Azure Entra External ID (formerly Azure AD B2C) tenant set up.

2.  **Application Registration**:
    Register a new application in your tenant to get a `Client ID`.

3.  **User Flow**:
    Create a 'Sign up and sign in' user flow and get its name.

## Configuration

Open `app.js` and replace the placeholder values in the `msalConfig` object with your Azure Entra External ID tenant details:

```javascript
const msalConfig = {
    auth: {
        clientId: "YOUR_CLIENT_ID",
        authority: "https://YOUR_TENANT_NAME.b2clogin.com/YOUR_TENANT_NAME.onmicrosoft.com/YOUR_SIGN_UP_SIGN_IN_POLICY",
        knownAuthorities: ["YOUR_TENANT_NAME.b2clogin.com"],
        // ...
    }
    // ...
};
```

## Running the Application

1.  **Install Dependencies**:
    You need a simple web server to run this application to avoid CORS issues with file loading. If you have Node.js and npm installed, you can install `http-server`:
    ```bash
    npm install
    ```

2.  **Start the Server**:
    Run the following command from the project root directory:
    ```bash
    npm start
    ```

3.  **Open in Browser**:
    Open your web browser and navigate to the URL provided by `http-server` (usually `http://127.0.0.1:8080`).

## Features

-   **Responsive Layout**: The application layout adjusts to different screen sizes.
-   **Sidebar Navigation**: A collapsible sidebar for navigating between different views.
-   **Azure Entra ID Authentication**: Secure sign-in and sign-up functionality.
-   **Protected Routes**: The 'Manage User' and 'Report' pages are only accessible to authenticated users.
