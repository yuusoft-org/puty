/**
 * Example class with nested properties and methods for testing
 */

export class UserManager {
  constructor(initialUser = null) {
    this.user = initialUser || {
      profile: {
        name: 'John Doe',
        age: 30,
        preferences: {
          theme: 'dark',
          language: 'en'
        }
      },
      account: {
        id: 12345,
        type: 'premium',
        balance: 100.50
      }
    };
    
    this.api = {
      client: {
        get: (endpoint) => `GET ${endpoint}`,
        post: (endpoint, data) => `POST ${endpoint} with ${JSON.stringify(data)}`
      },
      auth: {
        login: (username, password) => `Logged in ${username}`,
        logout: () => 'Logged out'
      }
    };
    
    this.settings = {
      ui: {
        getTheme: () => this.user.profile.preferences.theme,
        setTheme: (theme) => {
          this.user.profile.preferences.theme = theme;
          return theme;
        }
      },
      account: {
        getBalance: () => this.user.account.balance,
        addBalance: (amount) => {
          this.user.account.balance += amount;
          return this.user.account.balance;
        }
      }
    };
  }

  updateUserName(newName) {
    this.user.profile.name = newName;
    return this.user.profile.name;
  }

  upgradeAccount() {
    this.user.account.type = 'premium+';
    this.user.account.balance += 50;
    return this.user.account;
  }
}