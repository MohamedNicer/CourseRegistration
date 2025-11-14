sap.ui.define([], function() {
    "use strict";
    
    var AuthService = {
        _auth0: null,
        _isInitialized: false,
        
        init: function() {
            if (this._isInitialized) {
                return Promise.resolve();
            }
            
            return new Promise((resolve, reject) => {
                // Load Auth0 SDK
                const script = document.createElement('script');
                script.src = 'https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js';
                script.onload = async () => {
                    try {
                        this._auth0 = await auth0.createAuth0Client({
                            domain: window.Auth0Config.domain,
                            clientId: window.Auth0Config.clientId,
                            authorizationParams: {
                                redirect_uri: window.Auth0Config.redirectUri,
                                audience: window.Auth0Config.audience,
                                scope: window.Auth0Config.scope
                            }
                        });
                        
                        this._isInitialized = true;
                        
                        // Check if user is returning from login
                        if (location.search.includes('code=')) {
                            await this._auth0.handleRedirectCallback();
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                        
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                };
                script.onerror = reject;
                document.head.appendChild(script);
            });
        },
        
        login: async function() {
            if (!this._auth0) await this.init();
            await this._auth0.loginWithRedirect();
        },
        
        logout: function() {
            if (!this._auth0) return;
            this._auth0.logout({
                logoutParams: {
                    returnTo: window.location.origin + "/launchpad.html"
                }
            });
        },
        
        isAuthenticated: async function() {
            if (!this._auth0) await this.init();
            return await this._auth0.isAuthenticated();
        },
        
        getUser: async function() {
            if (!this._auth0) await this.init();
            return await this._auth0.getUser();
        },
        
        getToken: async function() {
            if (!this._auth0) await this.init();
            try {
                return await this._auth0.getTokenSilently();
            } catch (error) {
                if (error.error === 'login_required') {
                    await this.login();
                }
                throw error;
            }
        }
    };
    
    return AuthService;
});
