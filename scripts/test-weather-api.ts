#!/usr/bin/env node

/**
 * Weather API Verification Script
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🌤️  Weather API Verification');
console.log('============================\n');

async function testOpenWeatherAPI() {
  const apiKey = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No weather API key found in environment variables');
    return false;
  }

  console.log('🔍 Testing OpenWeather API...');
  console.log(`🔑 Using API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);

  try {
    // Test with Oakland (where one of our sample games is)
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: 'Oakland,CA,US',
        appid: apiKey,
        units: 'imperial', // Fahrenheit
      },
      timeout: 10000,
    });

    const weather = response.data;
    
    console.log('✅ OpenWeather API - SUCCESS!');
    console.log('📍 Location:', weather.name, weather.sys.country);
    console.log('🌡️  Temperature:', weather.main.temp + '°F');
    console.log('💨 Wind:', weather.wind.speed + ' mph', weather.wind.deg + '°');
    console.log('💧 Humidity:', weather.main.humidity + '%');
    console.log('☁️  Conditions:', weather.weather[0].description);
    console.log('🔄 Data Age:', new Date(weather.dt * 1000).toLocaleString());
    
    return {
      success: true,
      data: {
        temp_f: weather.main.temp,
        wind_mph: weather.wind.speed,
        wind_deg: weather.wind.deg,
        humidity: weather.main.humidity,
        condition: weather.weather[0].description,
        location: weather.name,
      }
    };
    
  } catch (error: any) {
    console.log('❌ OpenWeather API - FAILED');
    
    if (error.response) {
      console.log('📄 Status:', error.response.status);
      console.log('💬 Message:', error.response.data.message || 'Unknown error');
      
      if (error.response.status === 401) {
        console.log('🔑 API Key Error: The API key is invalid or unauthorized');
        console.log('💡 Solution: Check your OpenWeather API key at openweathermap.org');
      } else if (error.response.status === 404) {
        console.log('📍 Location Error: City not found');
      } else if (error.response.status === 429) {
        console.log('⏱️  Rate Limit: Too many requests - try again later');
      }
    } else {
      console.log('🌐 Network Error:', error.message);
    }
    
    return false;
  }
}

async function testWeatherAPIcom() {
  const apiKey = process.env.WEATHER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No WeatherAPI.com key found');
    return false;
  }

  console.log('\n🔍 Testing WeatherAPI.com (backup)...');

  try {
    const response = await axios.get('http://api.weatherapi.com/v1/current.json', {
      params: {
        key: apiKey,
        q: 'Oakland,CA',
        aqi: 'no',
      },
      timeout: 10000,
    });

    const weather = response.data;
    
    console.log('✅ WeatherAPI.com - SUCCESS!');
    console.log('📍 Location:', weather.location.name, weather.location.region);
    console.log('🌡️  Temperature:', weather.current.temp_f + '°F');
    console.log('💨 Wind:', weather.current.wind_mph + ' mph', weather.current.wind_dir);
    console.log('💧 Humidity:', weather.current.humidity + '%');
    console.log('☁️  Conditions:', weather.current.condition.text);
    
    return {
      success: true,
      data: {
        temp_f: weather.current.temp_f,
        wind_mph: weather.current.wind_mph,
        wind_dir: weather.current.wind_dir,
        humidity: weather.current.humidity,
        condition: weather.current.condition.text,
        location: weather.location.name,
      }
    };
    
  } catch (error: any) {
    console.log('❌ WeatherAPI.com - FAILED');
    
    if (error.response) {
      console.log('📄 Status:', error.response.status);
      if (error.response.status === 401) {
        console.log('🔑 API Key Error: Invalid WeatherAPI.com key');
      }
    } else {
      console.log('🌐 Network Error:', error.message);
    }
    
    return false;
  }
}

async function testVenueWeather() {
  console.log('\n🏟️  Testing MLB Venue Weather Data...');
  console.log('=====================================');
  
  const venues = [
    { name: 'Oakland Coliseum', city: 'Oakland,CA' },
    { name: 'Fenway Park', city: 'Boston,MA' },
    { name: 'Yankee Stadium', city: 'Bronx,NY' },
    { name: 'Dodger Stadium', city: 'Los Angeles,CA' },
    { name: 'Oracle Park', city: 'San Francisco,CA' },
  ];

  const apiKey = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;
  
  for (const venue of venues) {
    console.log(`\n📍 ${venue.name} (${venue.city}):`);
    
    try {
      const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          q: venue.city + ',US',
          appid: apiKey,
          units: 'imperial',
        },
        timeout: 5000,
      });

      const w = response.data;
      const windDir = getWindDirection(w.wind.deg);
      
      console.log(`   🌡️  ${w.main.temp}°F, feels like ${w.main.feels_like}°F`);
      console.log(`   💨 ${w.wind.speed} mph ${windDir}`);
      console.log(`   💧 ${w.main.humidity}% humidity`);
      console.log(`   ☁️  ${w.weather[0].description}`);
      
      // Baseball-specific analysis
      let gameImpact = '⚪ Neutral conditions';
      if (w.main.temp > 85) gameImpact = '🔥 Hot weather favors offense';
      else if (w.main.temp < 55) gameImpact = '🧊 Cold weather suppresses offense';
      
      if (w.wind.speed > 15) {
        const isWindOut = windDir.includes('S') || windDir.includes('SW') || windDir.includes('SE');
        gameImpact = isWindOut ? '🌪️  Strong wind blowing out - favors offense' : '💨 Strong wind blowing in - favors pitching';
      }
      
      console.log(`   ⚾ ${gameImpact}`);
      
    } catch (error) {
      console.log(`   ❌ Failed to get weather data`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

function getWindDirection(degrees: number): string {
  if (degrees === undefined) return 'Variable';
  
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

async function runWeatherTests() {
  try {
    // Test primary weather API
    const openWeatherResult = await testOpenWeatherAPI();
    
    // Test backup API
    await testWeatherAPIcom();
    
    // Test venue-specific weather if primary API works
    if (openWeatherResult && openWeatherResult.success) {
      await testVenueWeather();
    }
    
    console.log('\n📊 Weather API Test Summary:');
    console.log('============================');
    
    if (openWeatherResult && openWeatherResult.success) {
      console.log('✅ Weather integration is working correctly!');
      console.log('🎯 Ready for live game weather analysis');
      console.log('📈 Weather data will enhance prediction accuracy');
    } else {
      console.log('⚠️  Weather API needs attention');
      console.log('🔧 Check API key configuration');
      console.log('📝 System will use fallback weather data');
    }
    
  } catch (error) {
    console.error('❌ Weather test failed:', error);
  }
}

// Run the tests
runWeatherTests();