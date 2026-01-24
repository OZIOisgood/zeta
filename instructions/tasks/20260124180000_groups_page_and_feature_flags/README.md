# Groups Page and Feature Flags

## Description

Implement a "Groups" page feature availability based on user feature flags.

1.  Add a "Groups" tab to the application navigation bar.
2.  Redirect the user to the "Groups" page when the tab is clicked.
3.  Ensure the "Groups" tab and page are only accessible to users with the specific feature flag enabled.

## Requirements

- **Feature Service**: Implement a shared `FeatureService` to retrieve and manage feature flags.
- **Navigation**: Display the "Groups" link in the navbar only if the user has the required feature flag.
- **Routing**: Protect the "Groups" route with a Guard that checks for the feature flag.
- **Integration**: (Implied) Integrate with the authentication provider (WorkOS) or backend to retrieve user flags.

## Documentation

- [Taiga UI Documentation](https://taiga-ui.dev)
- [WorkOS Documentation](https://workos.com/docs)
