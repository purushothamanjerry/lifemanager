const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

async function seedData() {
  const Person = require('./models/Person');
  const Conversation = require('./models/Conversation');
  const Link = require('./models/Link');
  const Note = require('./models/Note');
  const Memory = require('./models/Memory');

  console.log('🌱 Seeding mock database...');

  // 1. Seed People
  const peopleData = [
    {
      name: 'Sarah Connor',
      gender: 'female',
      relationshipType: 'love',
      currentStatus: 'close',
      isSpecial: true,
      firstMeetingPlace: 'Techno Club',
      firstMeetingDate: new Date('2024-05-12'),
      howWeMet: 'Introduced by a mutual friend during a DJ night.',
      mobileNumber: '+1 555-0199',
      instagramId: 'sarah_c',
      linkedinId: 'sarahconnor',
      email: 'sarah@example.com',
      approximateAge: 28,
      hobbies: ['DJing', 'Hiking', 'Photography'],
      characterTraits: ['Energetic', 'Empathetic', 'Spontaneous'],
      loveLanguage: 'time',
      values: 'Honesty and adventure',
      notes: 'Loves specialty coffee and techno music.',
      lastConversationDate: new Date()
    },
    {
      name: 'John Doe',
      gender: 'male',
      relationshipType: 'friend',
      currentStatus: 'good',
      isSpecial: false,
      firstMeetingPlace: 'Co-working Space',
      firstMeetingDate: new Date('2023-09-01'),
      howWeMet: 'Sharing a hot desk at WeWork.',
      mobileNumber: '+1 555-0244',
      linkedinId: 'johndoe-dev',
      email: 'john.doe@example.com',
      approximateAge: 32,
      hobbies: ['Biking', 'Coding', 'Chess'],
      characterTraits: ['Calm', 'Analytical', 'Reliable'],
      loveLanguage: 'acts',
      notes: 'React developer. Very helpful with coding problems.',
      lastConversationDate: new Date(Date.now() - 3 * 24 * 3600 * 1000)
    },
    {
      name: 'Emily Watson',
      gender: 'female',
      relationshipType: 'colleague',
      currentStatus: 'drifting',
      isSpecial: false,
      firstMeetingPlace: 'Office Headquarters',
      firstMeetingDate: new Date('2022-01-15'),
      howWeMet: 'Joined the design team in the same week.',
      mobileNumber: '+1 555-0377',
      instagramId: 'emily_w_design',
      email: 'emily.w@company.com',
      approximateAge: 29,
      hobbies: ['Painting', 'Yoga', 'Cooking'],
      characterTraits: ['Creative', 'Reserved', 'Detail-oriented'],
      loveLanguage: 'words',
      notes: 'Senior UI/UX designer. Moves to London soon.',
      lastConversationDate: new Date(Date.now() - 15 * 24 * 3600 * 1000)
    }
  ];

  const createdPeople = await Person.create(peopleData);
  console.log(`✅ Created ${createdPeople.length} people`);

  // 2. Seed Conversations
  const conversationData = [
    {
      person: createdPeople[0]._id,
      date: new Date(Date.now() - 2 * 3600 * 1000),
      place: 'Central Park Cafe',
      summary: 'Discussed summer travel plans and weekend hiking paths. She recommended a music venue in Brooklyn.',
      mood: 'great'
    },
    {
      person: createdPeople[1]._id,
      date: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      place: 'Office Cafeteria',
      summary: 'Quick catchup about the new database migration project. John offered to review the schemas.',
      mood: 'good'
    }
  ];
  await Conversation.create(conversationData);

  // 3. Seed Links
  const linksData = [
    {
      name: 'GitHub Repository',
      source: 'GitHub',
      url: 'https://github.com/purushothamanjerry/lifemanager',
      about: 'Main repository containing mobile, frontend, and backend code.'
    },
    {
      name: 'Vite JS Documentation',
      source: 'Website',
      url: 'https://vite.dev',
      about: 'Vite documentation for frontend bundler configurations.'
    }
  ];
  await Link.create(linksData);

  // 4. Seed Notes
  const notesData = [
    {
      title: 'Idea: App improvements',
      content: 'We should add a notifications panel and a beautiful calendar view for tracking contact dates. Also need to @Sarah Connor for feedback.',
      mentionedPeople: [createdPeople[0]._id],
      tags: ['feature', 'ideas'],
      color: 'teal',
      isPinned: true
    },
    {
      title: 'Grocery list',
      content: 'Oat milk, specialty coffee beans, avocados, eggs, Greek yogurt, chicken breast.',
      tags: ['personal', 'todo'],
      color: 'gold',
      isPinned: false
    }
  ];
  await Note.create(notesData);

  // 5. Seed Memories
  const memoriesData = [
    {
      title: 'Concert Night',
      description: 'Had an amazing time listening to the local indie band under the stars. Excellent atmosphere.',
      date: new Date('2024-06-25'),
      place: 'Outdoor Ampitheater',
      emotion: 'joyful',
      tags: ['music', 'concert', 'friends'],
      peopleInvolved: [createdPeople[0]._id],
      isFavorite: true
    }
  ];
  await Memory.create(memoriesData);


  
  console.log('🌱 Database seeded successfully!');
}

async function start() {
  console.log('Starting in-memory MongoDB server...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log(`✅ In-memory MongoDB server started at: ${uri}`);
  
  process.env.MONGO_URI = uri;
  process.env.APP_PASSWORD = 'password123'; // Access pin/password for login
  
  // Set up connection listener to seed data
  mongoose.connection.once('open', () => {
    seedData().catch(err => {
      console.error('❌ Seeding failed:', err);
    });
  });
  
  // Start server.js
  require('./server.js');
}

start().catch(err => {
  console.error('Failed to start server:', err);
});
