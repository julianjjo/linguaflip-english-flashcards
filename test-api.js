// Simple test script to verify API endpoints
const BASE_URL = 'http://localhost:4322';

console.log('Testing LinguaFlip API endpoints...\n');

// Test registration
async function testRegistration() {
  console.log('1. Testing user registration...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123',
        confirmPassword: 'TestPassword123',
        username: 'testuser'
      })
    });

    const data = await response.json();
    console.log('Registration response:', response.status, data);
    
    if (data.success) {
      console.log('✅ Registration successful');
      return data.data.tokens?.accessToken;
    } else {
      console.log('❌ Registration failed:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Registration error:', error.message);
    return null;
  }
}

// Test login
async function testLogin() {
  console.log('\n2. Testing user login...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123'
      })
    });

    const data = await response.json();
    console.log('Login response:', response.status, data);
    
    if (data.success) {
      console.log('✅ Login successful');
      return data.data.accessToken;
    } else {
      console.log('❌ Login failed:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return null;
  }
}

// Test flashcard creation
async function testCreateFlashcard(token) {
  console.log('\n3. Testing flashcard creation...');
  try {
    const response = await fetch(`${BASE_URL}/api/flashcards/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        english: 'Hello',
        spanish: 'Hola',
        exampleEnglish: 'Hello, how are you?',
        exampleSpanish: 'Hola, ¿cómo estás?',
        category: 'greetings'
      })
    });

    const data = await response.json();
    console.log('Create flashcard response:', response.status, data);
    
    if (data.success) {
      console.log('✅ Flashcard created successfully');
      return data.data.cardId;
    } else {
      console.log('❌ Flashcard creation failed:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Flashcard creation error:', error.message);
    return null;
  }
}

// Test flashcard list
async function testListFlashcards(token) {
  console.log('\n4. Testing flashcard list...');
  try {
    const response = await fetch(`${BASE_URL}/api/flashcards/list`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log('List flashcards response:', response.status, data);
    
    if (data.success) {
      console.log(`✅ Listed ${data.data?.flashcards?.length || 0} flashcards`);
      return data.data?.flashcards || [];
    } else {
      console.log('❌ Flashcard list failed:', data.error);
      return [];
    }
  } catch (error) {
    console.log('❌ Flashcard list error:', error.message);
    return [];
  }
}

// Run all tests
async function runTests() {
  try {
    // Try registration first
    let token = await testRegistration();
    
    // If registration fails (user exists), try login
    if (!token) {
      token = await testLogin();
    }

    if (token) {
      const cardId = await testCreateFlashcard(token);
      await testListFlashcards(token);
      
      console.log('\n🎉 All tests completed!');
      console.log('You can now:');
      console.log('1. Visit http://localhost:4322/');
      console.log('2. Register/login with the test account');
      console.log('3. Create and study flashcards');
    } else {
      console.log('\n❌ Could not authenticate, skipping flashcard tests');
    }
  } catch (error) {
    console.log('\n❌ Test suite error:', error.message);
  }
}

runTests();