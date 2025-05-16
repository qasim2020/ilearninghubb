# Controller Documentation for iLearningHubb

This document explains the structure and organization of the controllers in the iLearningHubb application.

## Controller Organization

### Controller Utilities (`controllers/controllerUtils.js`)

Provides shared functionality used across controllers:

- `getSettings()`: Retrieves application settings from the database
- `renderPage()`: Handles consistent page rendering with error handling

### Index Controller (`controllers/indexController.js`)

Handles the main entry point of the application:

- Uses the centralized rendering logic for consistency
- Simplified by removing duplicate error handling logic

### Views Controller (`controllers/pageController.js`)

Handles all standard view routes in the application:

- Uses a factory pattern to create controllers with minimal code
- Each controller function is created by the `createPageController` factory
- Handles various page types (about, blog, program, team, etc.)
- Special cases can still be defined individually

### Error Controller (`controllers/errorController.js`)

Handles various error scenarios:

- `notFound`: Handles 404 errors
- `serverError`: Handles 500 internal server errors
- `validationError`: Handles validation errors

## Benefits of This Approach

1. **Reduced Code Duplication**: Common functionality is extracted to utility functions
2. **Consistent Error Handling**: All controllers handle errors in the same way
3. **Maintainability**: Changes to rendering logic can be made in one place
4. **Readability**: Controllers are concise and focused on their specific responsibilities
5. **Extensibility**: New controllers can be easily added using the factory pattern

## Adding a New Controller

To add a new controller for a simple page:

```javascript
// In pageController.js
exports.newPage = createPageController('new-page');

// In routes/regularRoutes.js
router.get('/new-page', pageController.newPage);
```

For a more complex controller that needs custom data:

```javascript
// In pageController.js
exports.complexPage = async (req, res) => {
    const customData = {
        // Your custom data here
    };
    
    await renderPage(req, res, 'complex-page', customData);
};
```

## Error Handling

All controllers use centralized error handling which:

1. Catches and logs errors
2. Provides appropriate user feedback
3. Includes detailed error information in development but not in production 