# ActionButton Usage Guide

The `ActionButton` component is a reusable floating action button that can be used across different screens for adding various content types like posts, groups, friends, events, and more.

## Basic Usage

```jsx
import ActionButton from '../../components/common/ActionButton';

// In your component:
<ActionButton 
  onPress={() => handleAddItem()}
  iconName="add"
/>
```

## Examples for Different Contexts

### Social Screen - Add Post
```jsx
<ActionButton 
  onPress={() => setShowCreatePostModal(true)}
  iconName="add"
  color="#007AFF"
/>
```

### Groups Screen - Create New Group
```jsx
<ActionButton 
  onPress={() => navigation.navigate('CreateGroupScreen')}
  iconName="people"
  color="#34C759" // Green color for groups
/>
```

### Events Screen - Add New Event
```jsx
<ActionButton 
  onPress={() => navigation.navigate('CreateEventScreen')}
  iconName="calendar"
  color="#FF9500" // Orange color for events
/>
```

### Friends Screen - Add New Friend
```jsx
<ActionButton 
  onPress={() => setShowAddFriendModal(true)}
  iconName="person-add"
  color="#5856D6" // Purple color for friends
/>
```

### Housing Screen - Add Housing Listing
```jsx
<ActionButton 
  onPress={() => navigation.navigate('AddHousingScreen')}
  iconName="home"
  color="#FF3B30" // Red color for housing
/>
```

## Customization Options

- **Position**: You can override the default bottom-right position with your own style
```jsx
<ActionButton 
  onPress={handleAction}
  style={{ bottom: 40, right: 40 }}
/>
```

- **Fixed vs In-Content**: If you don't want absolute positioning
```jsx
<ActionButton 
  onPress={handleAction}
  absolute={false} // Will position relative to parent
/>
```

- **Size Variations**: Change the button size for different contexts
```jsx
// Mini FAB
<ActionButton 
  onPress={handleAction}
  size={40}
/>

// Standard FAB
<ActionButton 
  onPress={handleAction}
  size={56} // Default
/>

// Large FAB
<ActionButton 
  onPress={handleAction}
  size={72}
/>
```

## Best Practices

1. Use consistent colors across the app for similar actions
2. Select appropriate icons that clearly communicate the action
3. Position the button where it won't interfere with critical content
4. Consider using the non-absolute version when the button should scroll with content
5. Use the standard size (56) for primary actions and smaller sizes for secondary actions
