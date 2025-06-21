// Test script to verify image URL generation
import { getValidImageUrl, getOptimizedImageUrl } from './imageHelper';

// Test cases
const testCases = [
  {
    name: 'Service image with full URL',
    input: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/service-images/test.jpg',
    bucket: 'providerimages'
  },
  {
    name: 'Service image with relative path',
    input: 'service-images/test.jpg',
    bucket: 'providerimages'
  },
  {
    name: 'Housing image with full URL',
    input: 'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/housingimages/house1.jpg',
    bucket: 'housingimages'
  },
  {
    name: 'Null/undefined image',
    input: null,
    bucket: 'providerimages'
  },
  {
    name: 'Empty string',
    input: '',
    bucket: 'providerimages'
  }
];

console.log('=== Testing Image URL Generation ===\n');

testCases.forEach(test => {
  console.log(`Test: ${test.name}`);
  console.log(`Input: ${test.input}`);
  
  const validUrl = getValidImageUrl(test.input, test.bucket, 'test');
  console.log(`Valid URL: ${validUrl}`);
  
  const optimizedUrl = getOptimizedImageUrl(validUrl, 400, 70);
  console.log(`Optimized URL: ${optimizedUrl}`);
  console.log('---\n');
});