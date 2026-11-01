const BASE_URL = process.env.TEST_API_URL || `http://localhost:${process.env.PORT || 5000}/api`;

async function post(endpoint, data, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return { status: res.status, ok: res.ok, data: json };
}

async function get(endpoint, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, { headers });
  const json = await res.json();
  return { status: res.status, ok: res.ok, data: json };
}

async function runTests() {
  console.log('🧪 Starting PrivateID Full-Stack Integration Tests...\n');

  // Test 1: Register User A (Alice)
  console.log('1. Registering Alice...');
  const regAlice = await post('/auth/register', {
    displayName: 'Alice Vance',
    password: 'password123',
    securityQuestion: 'What was your childhood nickname?',
    securityAnswer: 'Ally',
    bio: 'Software engineer & privacy advocate',
  });

  if (!regAlice.ok || !regAlice.data.chatId) {
    throw new Error(`Alice registration failed: ${JSON.stringify(regAlice.data)}`);
  }
  const alice = regAlice.data;
  console.log(`✅ Alice registered successfully! Chat ID: ${alice.chatId}`);

  // Test 2: Register User B (Bob)
  console.log('\n2. Registering Bob...');
  const regBob = await post('/auth/register', {
    displayName: 'Bob Martinez',
    password: 'password123',
    securityQuestion: 'What was the model of your first car?',
    securityAnswer: 'Civic',
    bio: 'Designer and audio enthusiast',
  });

  if (!regBob.ok || !regBob.data.chatId) {
    throw new Error(`Bob registration failed: ${JSON.stringify(regBob.data)}`);
  }
  const bob = regBob.data;
  console.log(`✅ Bob registered successfully! Chat ID: ${bob.chatId}`);

  // Test 3: ID Lookups
  console.log(`\n3. Alice searches for Bob using exact Chat ID (${bob.chatId})...`);
  const searchBob = await get(`/users/search?chatId=${bob.chatId}`, alice.token);
  if (!searchBob.ok || searchBob.data.user?.displayName !== 'Bob Martinez') {
    throw new Error(`Search failed: ${JSON.stringify(searchBob.data)}`);
  }
  console.log(`✅ Found Bob: ${searchBob.data.user.displayName} (${searchBob.data.user.chatId})`);

  console.log('Checking that random/fake Chat ID returns 404...');
  const searchFake = await get('/users/search?chatId=CHAT999999', alice.token);
  if (searchFake.status === 404) {
    console.log('✅ Unknown Chat ID properly rejected with 404 Not Found.');
  } else {
    throw new Error('Fake search should have returned 404');
  }

  // Test 4: Alice adds Bob to contacts
  console.log('\n4. Alice adds Bob to contacts...');
  const addContact = await post('/users/contacts', { targetUserId: bob.user._id, nickname: 'Bobby' }, alice.token);
  if (!addContact.ok) throw new Error('Add contact failed');
  console.log('✅ Contact added successfully.');

  // Test 5: Create 1-to-1 Conversation
  console.log('\n5. Creating 1-to-1 conversation...');
  const convRes = await post('/messages/conversations', { targetUserId: bob.user._id }, alice.token);
  if (!convRes.ok) throw new Error('Conversation creation failed');
  const conversationId = convRes.data.conversation._id;
  console.log(`✅ Conversation created. ID: ${conversationId}`);

  // Test 6: Alice sends message
  console.log('\n6. Alice sends message to Bob...');
  const msgRes = await post('/messages/messages', {
    conversationId,
    content: 'Hello Bob! This is our encrypted, private chat.',
    messageType: 'text',
  }, alice.token);
  if (!msgRes.ok) throw new Error('Send message failed');
  const messageId = msgRes.data.message._id;
  console.log(`✅ Message sent: "${msgRes.data.message.content}" (Status: ${msgRes.data.message.status})`);

  // Test 7: Bob reads messages
  console.log('\n7. Bob fetches messages and marks conversation as read...');
  const bobMsgs = await get(`/messages/conversations/${conversationId}/messages`, bob.token);
  if (!bobMsgs.ok || bobMsgs.data.messages.length === 0) throw new Error('Bob could not fetch messages');
  console.log(`✅ Bob received ${bobMsgs.data.messages.length} message(s).`);

  const markRead = await fetch(`${BASE_URL}/messages/conversations/${conversationId}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${bob.token}` },
  });
  if (markRead.ok) {
    console.log('✅ Conversation marked as read.');
  }

  // Test 8: Bob reacts with emoji
  console.log('\n8. Bob reacts to Alice\'s message with ❤️...');
  const reactRes = await post(`/messages/messages/${messageId}/reaction`, { emoji: '❤️' }, bob.token);
  if (!reactRes.ok) throw new Error('Emoji reaction failed');
  console.log(`✅ Reaction added: ${JSON.stringify(reactRes.data.reactions)}`);

  // Test 9: Bob replies
  console.log('\n9. Bob replies to Alice...');
  const replyRes = await post('/messages/messages', {
    conversationId,
    content: 'Hey Alice! Crystal clear audio and video ready on PrivateID.',
    messageType: 'text',
    replyTo: {
      messageId,
      senderName: 'Alice Vance',
      snippet: 'Hello Bob! This is our encrypted, private chat.',
      messageType: 'text',
    },
  }, bob.token);
  if (!replyRes.ok) throw new Error('Reply failed');
  console.log(`✅ Bob replied: "${replyRes.data.message.content}" with quoted reply.`);

  // Test 10: Account Recovery / Password Reset
  console.log('\n10. Testing Phoneless Account Recovery...');
  const secQ = await get(`/auth/security-question/${alice.chatId}`);
  if (!secQ.ok || secQ.data.securityQuestion !== 'What was your childhood nickname?') {
    throw new Error('Security question retrieval failed');
  }
  console.log(`✅ Retrieved security question for ${alice.chatId}: "${secQ.data.securityQuestion}"`);

  const resetRes = await post('/auth/reset-password', {
    chatId: alice.chatId,
    securityAnswer: 'Ally',
    newPassword: 'newsecurepassword123',
  });
  if (!resetRes.ok) throw new Error('Password reset failed');
  console.log('✅ Password reset successful.');

  const reLogin = await post('/auth/login', {
    chatId: alice.chatId,
    password: 'newsecurepassword123',
  });
  if (!reLogin.ok || !reLogin.data.token) throw new Error('Login with new password failed');
  console.log('✅ Alice successfully logged in with her new password!');

  console.log('\n🎉 ALL 10 INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
