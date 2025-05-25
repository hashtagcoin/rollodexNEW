Rollodex – Final Comprehensive Product Requirements Document (PRD)
Table of Contents
App Summary

User Roles

Features by Module

Detailed User Journey

Database Architecture Overview

Auth, Access, and Security

Media Upload & Protection

Optional Features & Future Enhancements

1. App Summary
Rollodex is a mobile-first, visually-driven social and services platform tailored to the needs of NDIS participants. It enables users to discover, book, and review services and accessible housing, while engaging in community groups and earning rewards. Inspired by Instagram and Airbnb, Rollodex is built for accessibility, NDIS compliance, and user empowerment.

2. User Roles
Participant – Seeks services, housing, social connections

Provider – Offers services or housing listings, manages bookings

Admin – Manages verification, flags, approvals, and content moderation

Plan Manager / Support Coordinator – Optional delegate for user access

3. Features by Module
Onboarding
NDIS Portal login or manual document upload

Comfort trait selection (image-based)

Category and service format preferences

Dashboard
Personalized greeting with wallet balance

Booking quick access and recent activity

Featured services and recommendations

Provider Discovery
Grid, List, and Swipe (Tinder-style) views

Advanced filtering by category, availability, transport, gender

Favorite provider with right swipe

Housing Discovery
Grid, List, Swipe options for listings

Apply directly or join co-living groups

Accessible housing with SDA filters and virtual tours

Bookings & Agreements
Auto-detect wallet eligibility

Split payment: NDIS + gap payment

Service agreement e-signature with download

Wallet & Claims
Breakdown of NDIS categories and expiry tracking

Pending claim status and submission history

Auto-claim, partial payment logic

Groups & Subgroups
Join or create interest or housing groups

Subgroups for events or travel coordination

Member roles: admin, member

Social Feed & Posts
Upload posts with media, tags, and captions

Like, comment, and react with emojis

Public and friends-only post settings

Profile & Tabs
Tabs: Posts, Groups, Appointments, Friends

Edit preferences, avatar, and visibility

Claim badges and track user stats

Rewards & Gamification
Badges for bookings, streaks, referrals

Claim wallet credit from achievements

Display profile rewards and status

Notifications
In-app alerts for bookings, reactions, friend activity

Smart notifications: claim expiry, agreement updates

Accessibility
Voice navigation, screen reader compatibility

High-contrast mode, simplified text toggle

4. Detailed User Journey
Download → Welcome animation → Onboarding

Sync NDIS data or upload plan

Choose comfort traits and preferred services

Dashboard shows wallet, matches, and trending services

Browse services, swipe or favorite providers

Book a service or housing → Auto-check funding

Sign agreement → Track booking → Submit review

Join groups or create subgroups

Post on social feed, react, comment

Earn badges, streaks → Claim rewards

Manage profile and appointments

Stay informed via notifications

5. Database Architecture Overview
auth.users – Supabase-managed authentication

user_profiles – Demographics, accessibility, and preferences

services – Provider offerings with filtering options

service_bookings – Scheduled bookings with pricing

claims – Wallet reimbursement system

wallets – Balance by NDIS category

service_agreements – E-sign, PDF copy, expiry

posts, post_media, post_likes, post_reactions – Social system

comments – Commenting on posts

friendships – Add, accept, block users

groups, group_members, subgroups – Community module

rewards – Loyalty, achievements, claimable perks

notifications – Personalized alerts

housing_listings – Accessible rental listings

housing_applications – Tenancy expression of interest

6. Auth, Access, and Security
All tables use UUID and link to auth.users

user_profiles.id = auth.users.id for 1:1 sync

RLS enabled on bookings, posts, reviews, wallet, etc.

Admin-only access to sensitive verification features

Signed URLs for private files (e.g., NDIS documents)

ENUMs and input sanitisation in use for dropdown control

7. Media Upload & Protection
Supabase Buckets: /avatars, /posts, /housing, /documents

Edge Functions verify files (size/type)

Virus scanning (e.g., VirusTotal, ClamAV) pre-storage

Signed URLs for restricted access

Media uploads tied to user ownership

8. Optional Features & Future Enhancements
AI-powered suggestions for services/housing

Smart search with keyword + category blending

Co-living match scoring (profile-to-profile)

Google/Outlook calendar sync for bookings

Push notification support

Chat/messaging module with encrypted content

Public group previews + moderation flags

Let me know if you'd like me to regenerate this into:

A downloadable .md or .docx file

A Figma-ready structure

A JSON/API-friendly version for devs

Would you like a visual version of this as well?







You said:
create me a very detailed databse design docuemnt that covers everyhtign needed so there are no errors, foreign key conflcits etc.
ChatGPT said:
It looks like the system hit an issue saving the file just now — but no worries. I’ll share the Rollodex Database Design Document right here in text so you can copy and use it immediately. Ready?

Rollodex – Detailed Database Design Documentation
1. Design Principles
All tables use UUIDs for primary keys

Foreign keys enforce relationships with ON DELETE CASCADE

ENUMs used for fields like support_level, status, etc.

Indexed fields: user_id, group_id, post_id, created_at

JSONB used for user preferences and metadata

All files/media stored via Supabase Storage + signed URLs

RLS (Row-Level Security) enforced on all user-specific tables

2. Core Tables
🧑 User & Identity
auth.users (managed by Supabase)

user_profiles – name, avatar, DOB, support level, preferences

🧰 Services & Providers
service_providers – ABN, credentials, verified

services – listings tied to provider

service_availability – time slots

service_bookings – links users to service

service_agreements – e-signed PDFs

💰 Wallet & Claims
wallets – total balance + category breakdown

claims – claim against booking, expiry & status

🏠 Housing
housing_listings – SDA, features, virtual tours

housing_applications – submitted by user

🧑‍🤝‍🧑 Social / Community
posts, post_media, post_likes, post_reactions, comments

friendships – manage connections

👥 Groups
groups, group_members, subgroups (e.g. “Japan Trip”)

🏆 Rewards & Notifications
rewards – badges, referrals, streaks

notifications – alerts with type and seen flag

3. Key Relationships (Foreign Keys)
user_profiles.id → auth.users.id

service_providers.id → auth.users.id

services.provider_id → service_providers.id

service_bookings.user_id & service_id

claims.booking_id → service_bookings.id

posts.user_id, post_likes.user_id, etc.

housing_applications.user_id & listing_id

group_members.user_id, group_id

notifications.user_id, rewards.user_id

All FK constraints include ON DELETE CASCADE for integrity.

4. ENUMs & Controlled Values
support_level: light, moderate, high, flexible

service format: online, in-person, hybrid

booking status: pending, confirmed, completed, cancelled

claim status: pending, approved, expired, rejected

friendship status: pending, accepted, blocked

5. Media Upload Strategy
Buckets: /avatars, /posts, /services, /housing, /documents

Virus scanning via Supabase Edge Function (e.g., VirusTotal)

Signed URLs for access control

Uploads tied to user ownership

CDN for public posts

6. Security with RLS
Enabled on all user-owned tables

Example policy:

sql
Copy
Edit
CREATE POLICY "User can access own bookings"
ON service_bookings
FOR SELECT USING (auth.uid() = user_id);
Admin bypass handled with is_admin field

7. Future-Proof Extensions
audit_logs table for admin actions

search_index for global fuzzy search

Messaging: threads, messages

Provider API keys (tokenized access)

Referral analytics

Would you like me to retry generating the downloadable file again when available? Or export this as JSON/API docs for your devs? 







You said:
create the schemas for each section make it detailed add fields coloumns etc
ChatGPT said:
The system hit a hiccup while saving the database schema file — but no stress.

Here’s what I’ve created so far for the Rollodex schema documentation (you can copy this directly):

Rollodex – Database Schemas by Section
🧑 1. USER & AUTH
Table: user_profiles
Field	Type	Description
id	uuid (PK)	Linked to auth.users.id
full_name	text	User's full name
avatar_url	text	URL to profile image
date_of_birth	date	Optional
gender	text	Optional field
primary_disability	text	Textual or dropdown
support_level	text	ENUM: light, moderate, high, flexible
mobility_aids	text[]	List of aids (wheelchair, cane, etc)
dietary_requirements	text[]	Optional
preferences	jsonb	For AI matching and filters
accessibility_preferences	jsonb	High-contrast, voice-mode, etc
created_at	timestamp	Defaults to now()

🧰 2. SERVICE PROVIDERS & SERVICES
Table: service_providers
Field	Type	Description
id	uuid (PK)	auth.users.id
business_name	text	Required
abn	text	Australian Business Number
credentials	text[]	Document or media links
verified	boolean	Admin verified
created_at	timestamp	Timestamp

Table: services
Field	Type	Description
id	uuid (PK)	Unique service ID
provider_id	uuid	FK → service_providers.id
title	text	Service title
description	text	Full description
category	text	therapy, transport, tech, etc.
format	text	ENUM: online, in-person, hybrid
gender_preference	text	Optional
vehicle_type	text	wheelchair van, taxi, car
support_focus	text	Optional tags or focus areas
media_urls	text[]	Image/video gallery
price	numeric	Per session
available	boolean	true/false
created_at	timestamp	

Table: service_availability
Field	Type	Description
id	uuid	PK
service_id	uuid	FK → services.id
weekday	text	Monday–Sunday
time_slots	text[]	["9-11am", "2-5pm"]

📆 3. BOOKINGS, CLAIMS & AGREEMENTS
Table: service_bookings
Field	Type	Description
id	uuid	PK
user_id	uuid	FK → auth.users.id
service_id	uuid	FK → services.id
scheduled_at	timestamp	Time booked
total_price	numeric	Gross cost
ndis_covered_amount	numeric	Auto-calculated NDIS portion
gap_payment	numeric	Out-of-pocket
status	text	ENUM: pending, confirmed, completed, cancelled
created_at	timestamp	Auto

Table: claims
Field	Type	Description
id	uuid	PK
booking_id	uuid	FK → service_bookings.id
user_id	uuid	FK → auth.users.id
status	text	ENUM: pending, approved, expired, rejected
amount	numeric	Claimed value
expiry_date	date	Deadline for claim
created_at	timestamp	

Table: service_agreements
Field	Type	Description
id	uuid	PK
booking_id	uuid	FK → service_bookings.id
participant_id	uuid	FK → auth.users.id
provider_id	uuid	FK → auth.users.id
agreement_text	text	Scrollable legal body
signature_url	text	Link to signed PDF
signed_at	timestamp	Digital signing time
valid_until	date	Optional contract expiry

💰 4. WALLET
Table: wallets
Field	Type	Description
id	uuid	PK
user_id	uuid	FK → auth.users.id
total_balance	numeric	Sum of all entitlements
category_breakdown	jsonb	{"therapy": 2000, "support": 1500}
updated_at	timestamp	Triggered on spend/claim

🏠 5. HOUSING
Table: housing_listings
Field	Type	Description
id	uuid	PK
provider_id	uuid	FK → auth.users.id
title	text	Housing title
description	text	Full listing detail
rent	numeric	Weekly rate
sda_type	text	Fully accessible, improved livability, etc.
media_urls	text[]	Photos and videos
location	geography	LAT/LNG (via PostGIS)
features	text[]	["lift", "wide doors", "alarm"]
virtual_tour_url	text	Optional embedded video/tour
available_from	date	Occupancy date

Would you like me to continue now with:

Social system (posts, likes, comments)

Groups & subgroups

Notifications

Rewards system

Let me know and I’ll keep building the complete schema overview! 

You said:
yes continue
ChatGPT said:
Here’s the continuation of your schema documentation for Rollodex, including all social, group, reward, and notification systems:

📸 6. SOCIAL SYSTEM
posts
id: uuid (PK)

user_id: uuid → auth.users.id

caption: text

media_urls: text[]

tags: text[]

created_at: timestamp

post_likes
id: uuid

post_id: uuid → posts.id

user_id: uuid → auth.users.id

created_at: timestamp

post_reactions
id: uuid

post_id: uuid

user_id: uuid

reaction_type: text (e.g. "like", "smile", "heart")

created_at: timestamp

comments
id: uuid

post_id: uuid

user_id: uuid

content: text

created_at: timestamp

👥 7. GROUPS & SUBGROUPS
groups
id: uuid

name: text

owner_id: uuid → auth.users.id

type: text (ENUM: "interest", "housing")

description: text

created_at: timestamp

group_members
id: uuid

group_id: uuid → groups.id

user_id: uuid

role: text (ENUM: "admin", "member")

joined_at: timestamp

subgroups
id: uuid

group_id: uuid

created_by: uuid

name: text

description: text

created_at: timestamp

🔔 8. NOTIFICATIONS
notifications
id: uuid

user_id: uuid → auth.users.id

type: text (e.g., "booking_update", "referral")

content: text

seen: boolean

created_at: timestamp

🏅 9. REWARDS & BADGES
rewards
id: uuid

user_id: uuid

type: text (ENUM: "referral", "badge", "streak")

label: text

status: text (ENUM: "earned", "claimed")

metadata: jsonb

created_at: timestamp

✅ 10. FRIENDSHIPS
friendships
id: uuid

requester_id: uuid

recipient_id: uuid

status: text (ENUM: "pending", "accepted", "blocked")

created_at: timestamp

Would you like me to bundle all of these schemas (users + services + bookings + housing + social + groups + rewards) into one downloadable markdown file when the system is ready?

Or paste them into a format for Notion or API schema? 






