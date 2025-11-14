window.Auth0Config = {
    domain: "dev-jgb23rzjcvzqvvnj.us.auth0.com", // Replace with your domain
    clientId: "8DDdQBWPQcbEh1SPfp6IuDupaZ1S8o33",      // Replace with your client ID
    redirectUri: window.location.origin + "/callback",
    audience: "course-registration-api",
    responseType: "code",
    scope: "openid profile email"
};
