# Provider Dashboard Implementation

This module implements the provider dashboard functionality for the Rollodex app, allowing service providers to manage their listings, appointments, service agreements, and availability.

## Features

1. **Provider Dashboard**
   - Switch between participant and provider views
   - View key metrics (bookings, agreements, revenue)
   - Instagram-style horizontal lists for upcoming appointments
   - Quick access to provider management features

2. **Listings Management**
   - Airbnb-style cards for service and housing listings
   - Toggle listing availability
   - Edit listing details
   - Add new listings

3. **Appointments Management**
   - View upcoming, past, and all appointments
   - Instagram-style list view for appointments
   - Confirm, cancel, or mark appointments as completed
   - View appointment details

4. **Service Agreements**
   - Upload and manage agreement templates
   - Create new agreements from templates
   - Track signature status
   - Manage active and completed agreements

5. **Availability Calendar**
   - Set available time slots for specific services
   - View booked appointments on calendar
   - Bulk actions for availability management

## Database Schema

The provider dashboard functionality is supported by the following database tables:

1. `provider_availability` - Stores time slots when providers are available
2. `service_agreement_templates` - Stores templates for service agreements
3. `service_agreements` - Stores active agreements between providers and clients
4. `bookings_with_provider_details` - View that combines booking data with provider and client details
5. Extension to `user_profiles` with `provider_dashboard_preferences`

## UI/UX Principles

- Consistent UI design with the main participant dashboard
- Instagram-style horizontal scrolling lists for appointments and listings
- Airbnb-style cards for all service and housing listings
- Consistent color scheme and typography
- App header and bottom navbar on all screens
- Clear status indicators for bookings, agreements, and availability

## Navigation

The provider dashboard is integrated with the main navigation through:

1. A switch button on the participant dashboard
2. Conditional rendering in the MainTabs navigator
3. A dedicated ProviderStackNavigator for all provider-specific screens

## Implementation Details

- Provider mode state is managed through UserContext
- State persistence using AsyncStorage
- Real-time data fetching from Supabase
- Proper loading states and error handling
- Empty states with helpful action buttons
