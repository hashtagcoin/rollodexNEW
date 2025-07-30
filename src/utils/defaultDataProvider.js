// Default data provider for new users
// This provides sample/default data to prevent empty states

export const defaultDataProvider = {
  // Sample events for new users
  getDefaultEvents: () => [
    {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Community Meet & Greet',
      description: 'Join us for a friendly gathering to meet other community members',
      event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Community Center',
      image_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=400&fit=crop',
      category: 'Social',
      participant_count: 12,
      is_default: true
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      title: 'Art Workshop',
      description: 'Express yourself through art in our accessible workshop',
      event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
      start_time: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Creative Space',
      image_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop',
      category: 'Creative',
      participant_count: 8,
      is_default: true
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      title: 'Wellness Session',
      description: 'Relax and rejuvenate with guided wellness activities',
      event_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Wellness Center',
      image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop',
      category: 'Health',
      participant_count: 15,
      is_default: true
    }
  ],

  // Sample services for recommendations
  getDefaultServices: () => [
    {
      id: '00000000-0000-0000-0000-000000000101',
      title: 'Support Coordination',
      description: 'Professional support to help you navigate NDIS services',
      price: 80,
      price_type: 'per_hour',
      category: 'Support',
      provider_name: 'Community Support Services',
      rating: 4.8,
      reviews_count: 24,
      media_urls: ['https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png'],
      ndis_approved: true,
      is_default: true
    },
    {
      id: '00000000-0000-0000-0000-000000000102',
      title: 'Transport Assistance',
      description: 'Safe and reliable transport for appointments and activities',
      price: 45,
      price_type: 'per_trip',
      category: 'Transport',
      provider_name: 'Mobility Solutions',
      rating: 4.6,
      reviews_count: 18,
      media_urls: ['https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png'],
      ndis_approved: true,
      is_default: true
    },
    {
      id: '00000000-0000-0000-0000-000000000103',
      title: 'Social Activities',
      description: 'Join group activities and build meaningful connections',
      price: 35,
      price_type: 'per_session',
      category: 'Social',
      provider_name: 'Community Connect',
      rating: 4.9,
      reviews_count: 31,
      media_urls: ['https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png'],
      ndis_approved: true,
      is_default: true
    },
    {
      id: '00000000-0000-0000-0000-000000000104',
      title: 'Home Care Support',
      description: 'Assistance with daily living activities in your home',
      price: 55,
      price_type: 'per_hour',
      category: 'Care',
      provider_name: 'Care at Home',
      rating: 4.7,
      reviews_count: 42,
      media_urls: ['https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/default-service.png'],
      ndis_approved: true,
      is_default: true
    }
  ],

  // Sample housing listings
  getDefaultHousing: () => [
    {
      id: 'default-housing-1',
      title: 'Accessible Studio Apartment',
      description: 'Fully accessible studio with modern amenities',
      price_per_week: 280,
      location: 'Inner City',
      bedrooms: 1,
      bathrooms: 1,
      accessibility_features: ['Wheelchair accessible', 'Grab rails', 'Step-free access'],
      image_url: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housingimages/default-housing.jpg',
      is_default: true
    },
    {
      id: 'default-housing-2',
      title: 'Shared Living Home',
      description: 'Join a supportive shared living environment',
      price_per_week: 220,
      location: 'Suburban',
      bedrooms: 1,
      bathrooms: 1,
      accessibility_features: ['Accessible bathroom', 'Wide doorways', 'Emergency call system'],
      image_url: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housingimages/default-housing.jpg',
      is_default: true
    }
  ],

  // Welcome messages for new users
  getWelcomeMessages: () => ({
    dashboard: {
      title: "Welcome to Rollodex!",
      subtitle: "Let's get you started on your journey",
      tips: [
        "Browse available services in the Explore tab",
        "Connect with others in the Social section",
        "Check out upcoming events to join the community",
        "Complete your profile for personalized recommendations"
      ]
    },
    provider: {
      title: "Welcome Provider!",
      subtitle: "Start making a difference in the community",
      tips: [
        "Create your first service listing to get started",
        "Set your availability in the calendar",
        "Complete your provider profile for better visibility",
        "Check out the provider guide for best practices"
      ]
    }
  }),

  // Empty state messages
  getEmptyStateMessages: () => ({
    favorites: {
      icon: 'heart-outline',
      title: 'No favorites yet',
      subtitle: 'Services you favorite will appear here',
      action: 'Explore Services'
    },
    bookings: {
      icon: 'calendar-outline',
      title: 'No bookings yet',
      subtitle: 'Your upcoming appointments will appear here',
      action: 'Browse Services'
    },
    wallet: {
      icon: 'wallet-outline',
      title: 'Wallet not set up',
      subtitle: 'Check out upcoming events instead',
      action: 'View Events'
    },
    messages: {
      icon: 'chatbubble-outline',
      title: 'No messages yet',
      subtitle: 'Start a conversation with service providers',
      action: 'Find Providers'
    }
  })
};

// Utility function to check if user is new (for determining when to show defaults)
export const isNewUser = (profile) => {
  if (!profile) return true;
  
  // Check if profile was created within the last 7 days
  const profileCreatedAt = new Date(profile.created_at);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  return profileCreatedAt > sevenDaysAgo;
};

// Shuffle array utility for randomizing default content
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};