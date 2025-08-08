Rollodex – Full Database Schema Documentation
📌 Contents
User & Auth

Services & Providers

Bookings, Claims & Agreements

Wallet

Housing

Social System

Groups & Subgroups

Notifications

Rewards & Badges

Friendships

1. USER & AUTH – user_profiles
id: uuid (PK) – Linked to auth.users.id

full_name: text

avatar_url: text

date_of_birth: date

gender: text

primary_disability: text

support_level: text (ENUM: light, moderate, high, flexible)

mobility_aids: text[]

dietary_requirements: text[]

preferences: jsonb

accessibility_preferences: jsonb

created_at: timestamp

2. SERVICES & PROVIDERS
service_providers
id: uuid (PK) – FK to auth.users.id

business_name: text

abn: text

credentials: text[]

verified: boolean

created_at: timestamp

services
id: uuid

provider_id: uuid (FK → service_providers)

title: text

description: text

category: text

format: text (ENUM: online, in-person, hybrid)

gender_preference: text

vehicle_type: text

support_focus: text

media_urls: text[]

price: numeric

available: boolean

created_at: timestamp

service_availability
id: uuid

service_id: uuid

weekday: text

time_slots: text[]

3. BOOKINGS, CLAIMS, AGREEMENTS
service_bookings
id: uuid

user_id: uuid

service_id: uuid

scheduled_at: timestamp

total_price: numeric

ndis_covered_amount: numeric

gap_payment: numeric

status: text (ENUM)

created_at: timestamp

claims
id: uuid

booking_id: uuid

user_id: uuid

status: text (ENUM: pending, approved, expired, rejected)

amount: numeric

expiry_date: date

created_at: timestamp

service_agreements
id: uuid

booking_id: uuid

participant_id: uuid

provider_id: uuid

agreement_text: text

signature_url: text

signed_at: timestamp

valid_until: date

4. WALLET
wallets
id: uuid

user_id: uuid

total_balance: numeric

category_breakdown: jsonb

updated_at: timestamp

5. HOUSING
housing_listings
id: uuid

provider_id: uuid

title: text

description: text

rent: numeric

sda_type: text

media_urls: text[]

location: geography

features: text[]

virtual_tour_url: text

available_from: date

housing_applications
id: uuid

user_id: uuid

listing_id: uuid

preferences: jsonb

status: text

6. SOCIAL SYSTEM
posts
id: uuid

user_id: uuid

caption: text

media_urls: text[]

tags: text[]

created_at: timestamp

post_likes
id: uuid

post_id: uuid

user_id: uuid

created_at: timestamp

post_reactions
id: uuid

post_id: uuid

user_id: uuid

reaction_type: text

created_at: timestamp

comments
id: uuid

post_id: uuid

user_id: uuid

content: text

created_at: timestamp

7. GROUPS & SUBGROUPS
groups
id: uuid

name: text

owner_id: uuid

type: text (ENUM: interest, housing)

description: text

created_at: timestamp

group_members
id: uuid

group_id: uuid

user_id: uuid

role: text (ENUM: admin, member)

joined_at: timestamp

subgroups
id: uuid

group_id: uuid

created_by: uuid

name: text

description: text

created_at: timestamp

8. NOTIFICATIONS
notifications
id: uuid

user_id: uuid

type: text

content: text

seen: boolean

created_at: timestamp

9. REWARDS & BADGES
rewards
id: uuid

user_id: uuid

type: text (badge, referral, streak)

label: text

status: text (earned, claimed)

metadata: jsonb

created_at: timestamp

10. FRIENDSHIPS
friendships
id: uuid

requester_id: uuid

recipient_id: uuid

status: text (ENUM: pending, accepted, blocked)

created_at: timestamp

