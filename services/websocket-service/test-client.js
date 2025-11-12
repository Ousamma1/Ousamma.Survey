/**
 * WebSocket Service Test Client
 *
 * This script tests the WebSocket service by connecting and testing various features.
 *
 * Usage:
 *   node test-client.js
 */

const io = require('socket.io-client');

const WS_URL = process.env.WS_URL || 'http://localhost:3002';
const TEST_DURATION = 30000; // 30 seconds

console.log('='.repeat(60));
console.log('WebSocket Service Test Client');
console.log('='.repeat(60));
console.log(`URL: ${WS_URL}`);
console.log(`Test Duration: ${TEST_DURATION}ms`);
console.log('='.repeat(60));
console.log('');

// Test scenarios
const tests = {
  connected: false,
  roomJoined: false,
  roomLeft: false,
  ping: false,
  roomsList: false
};

let testTimeout;

// Create socket connection
const socket = io(WS_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 3,
  reconnectionDelay: 1000
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log(`   Socket ID: ${socket.id}`);
  tests.connected = true;
});

socket.on('connected', (data) => {
  console.log('✅ Received connection confirmation');
  console.log(`   User ID: ${data.userId}`);
  console.log(`   Anonymous: ${data.isAnonymous}`);
  console.log(`   Auto-joined rooms: ${data.rooms.join(', ')}`);
  console.log('');

  // Test 1: Join a room
  console.log('📝 Test 1: Joining room "survey:test123"...');
  socket.emit('join_room', { room: 'survey:test123' });
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected from server');
  console.log(`   Reason: ${reason}`);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

// Room events
socket.on('room_joined', (data) => {
  console.log('✅ Successfully joined room');
  console.log(`   Room: ${data.room}`);
  console.log('');
  tests.roomJoined = true;

  // Test 2: Send ping
  console.log('📝 Test 2: Sending ping...');
  socket.emit('ping');
});

socket.on('room_left', (data) => {
  console.log('✅ Successfully left room');
  console.log(`   Room: ${data.room}`);
  console.log('');
  tests.roomLeft = true;
});

// Ping/pong
socket.on('pong', (data) => {
  console.log('✅ Received pong');
  console.log(`   Server time: ${data.timestamp}`);
  console.log('');
  tests.ping = true;

  // Test 3: Get rooms list
  console.log('📝 Test 3: Getting rooms list...');
  socket.emit('get_rooms');
});

socket.on('rooms_list', (data) => {
  console.log('✅ Received rooms list');
  console.log(`   Rooms: ${data.rooms.map(r => r.name).join(', ')}`);
  console.log('');
  tests.roomsList = true;

  // Test 4: Leave room
  console.log('📝 Test 4: Leaving room "survey:test123"...');
  socket.emit('leave_room', { room: 'survey:test123' });

  // Wait a bit then print summary
  setTimeout(printSummary, 3000);
});

// Real-time events
socket.on('response.new', (data) => {
  console.log('📨 New response received:');
  console.log(`   Survey ID: ${data.surveyId}`);
  console.log(`   Response ID: ${data.responseId}`);
  console.log('');
});

socket.on('analytics.update', (data) => {
  console.log('📊 Analytics update received:');
  console.log(`   Survey ID: ${data.surveyId || 'N/A'}`);
  console.log(`   Project ID: ${data.projectId || 'N/A'}`);
  console.log('');
});

socket.on('surveyor.location', (data) => {
  console.log('📍 Location update received:');
  console.log(`   Surveyor ID: ${data.surveyorId}`);
  console.log(`   Location: ${JSON.stringify(data.location)}`);
  console.log('');
});

socket.on('notification', (data) => {
  console.log('🔔 Notification received:');
  console.log(`   Type: ${data.notificationType}`);
  console.log(`   Message: ${data.message}`);
  console.log('');
});

// Error events
socket.on('error', (data) => {
  console.error('❌ Server error:', data.message);
});

socket.on('rate_limit_exceeded', (data) => {
  console.warn('⚠️  Rate limit exceeded:', data.message);
});

// User events
socket.on('user_connected', (data) => {
  console.log('👤 User connected:', data.userId);
});

socket.on('user_disconnected', (data) => {
  console.log('👤 User disconnected:', data.userId);
});

// Print test summary
function printSummary() {
  console.log('');
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));

  const allTests = Object.entries(tests);
  const passed = allTests.filter(([_, result]) => result).length;
  const total = allTests.length;

  allTests.forEach(([test, result]) => {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test}`);
  });

  console.log('');
  console.log(`Results: ${passed}/${total} tests passed`);
  console.log('='.repeat(60));
  console.log('');

  if (passed === total) {
    console.log('🎉 All tests passed!');
    console.log('');
    console.log('The WebSocket service is working correctly.');
    console.log('You can now test real-time events by:');
    console.log('1. Publishing messages to Kafka topics');
    console.log('2. Using the HTTP broadcast API');
    console.log('3. Opening the map dashboard in a browser');
  } else {
    console.log('⚠️  Some tests failed. Please check the logs.');
  }

  console.log('');
  console.log(`Test will continue listening for ${Math.floor((TEST_DURATION - 6000) / 1000)}s...`);
  console.log('Press Ctrl+C to exit.');
  console.log('');

  // Set timeout to close
  testTimeout = setTimeout(() => {
    console.log('Test completed. Disconnecting...');
    socket.disconnect();
    process.exit(passed === total ? 0 : 1);
  }, TEST_DURATION - 6000);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nTest interrupted. Disconnecting...');
  if (testTimeout) clearTimeout(testTimeout);
  socket.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nTest terminated. Disconnecting...');
  if (testTimeout) clearTimeout(testTimeout);
  socket.disconnect();
  process.exit(0);
});
