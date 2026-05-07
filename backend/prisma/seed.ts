import { PrismaClient, UserRole, EventStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Institutes
  const institutes = await Promise.all([
    prisma.instituteDict.upsert({
      where: { name: 'Институт информационных технологий' },
      update: {},
      create: { name: 'Институт информационных технологий', code: 'IIT' },
    }),
    prisma.instituteDict.upsert({
      where: { name: 'Институт экономики и управления' },
      update: {},
      create: { name: 'Институт экономики и управления', code: 'IEU' },
    }),
    prisma.instituteDict.upsert({
      where: { name: 'Институт гуманитарных наук' },
      update: {},
      create: { name: 'Институт гуманитарных наук', code: 'IGN' },
    }),
    prisma.instituteDict.upsert({
      where: { name: 'Институт физической культуры и спорта' },
      update: {},
      create: { name: 'Институт физической культуры и спорта', code: 'IFKS' },
    }),
  ]);

  // Admin
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      login: 'admin',
      email: 'admin@university.ru',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
    },
  });

  // Organizer
  const orgHash = await bcrypt.hash('organizer123', 10);
  const organizer = await prisma.user.upsert({
    where: { login: 'organizer1' },
    update: {},
    create: {
      login: 'organizer1',
      email: 'organizer@university.ru',
      passwordHash: orgHash,
      role: UserRole.ORGANIZER,
      organizerProfile: {
        create: {
          fullName: 'Иванова Мария Петровна',
          position: 'Заместитель декана по воспитательной работе',
          organizationName: 'Студенческий совет ИИТ',
          organizationInfo: 'Организуем мероприятия для студентов института',
          contacts: 'ivanova@university.ru | +7 (999) 123-45-67',
        },
      },
    },
  });

  // Student
  const studentHash = await bcrypt.hash('student123', 10);
  const student = await prisma.user.upsert({
    where: { login: 'student1' },
    update: {},
    create: {
      login: 'student1',
      email: 'student@university.ru',
      passwordHash: studentHash,
      role: UserRole.STUDENT,
      studentProfile: {
        create: {
          fullName: 'Петров Алексей Сергеевич',
          phone: '+7 (900) 000-00-01',
          instituteId: institutes[0].id,
          group: 'ИТ-21',
          yearOfStudy: 3,
        },
      },
    },
  });

  // Events
  const orgProfile = await prisma.organizerProfile.findUnique({ where: { userId: organizer.id } });
  if (!orgProfile) return;

  const events = [
    {
      title: 'Хакатон «Цифровой кампус 2024»',
      description: 'Двухдневный хакатон для студентов всех специальностей. Создайте инновационное решение для цифровизации образования! Команды от 2 до 5 человек. Призовой фонд — 150 000 рублей.',
      type: 'hackathon',
      startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      address: 'ул. Университетская, 1, корпус А, актовый зал',
      latitude: 55.751244,
      longitude: 37.618423,
      capacity: 100,
      status: EventStatus.PUBLISHED,
      contactEmail: 'hackathon@university.ru',
      chatLink: 'https://t.me/hackathon2024',
      instituteId: institutes[0].id,
    },
    {
      title: 'Карьерный форум «Твоё будущее»',
      description: 'Встреча с представителями ведущих IT-компаний. Нетворкинг, мастер-классы по резюме и подготовке к собеседованиям. Участие бесплатное, регистрация обязательна.',
      type: 'career',
      startAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
      address: 'ул. Университетская, 1, конференц-зал',
      latitude: 55.752244,
      longitude: 37.619423,
      capacity: 200,
      status: EventStatus.PUBLISHED,
      contactEmail: 'career@university.ru',
    },
    {
      title: 'Научная конференция студентов ИИТ',
      description: 'Ежегодная конференция, где студенты представляют результаты своих исследований и учебных проектов. Лучшие доклады публикуются в сборнике научных трудов.',
      type: 'academic',
      startAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      address: 'ул. Университетская, 2, ауд. 301',
      latitude: 55.750244,
      longitude: 37.617423,
      capacity: 50,
      status: EventStatus.PUBLISHED,
      instituteId: institutes[0].id,
    },
    {
      title: 'Студенческий концерт «Весна в кампусе»',
      description: 'Ежегодный весенний концерт студенческих коллективов. Вокал, танцы, КВН и многое другое! Вход свободный.',
      type: 'cultural',
      startAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      address: 'ул. Университетская, 1, большой актовый зал',
      latitude: 55.751244,
      longitude: 37.618423,
      capacity: 500,
      status: EventStatus.PUBLISHED,
    },
  ];

  for (const eventData of events) {
    const existing = await prisma.event.findFirst({ where: { title: eventData.title } });
    if (!existing) {
      await prisma.event.create({
        data: { ...eventData, organizerId: orgProfile.id },
      });
    }
  }

  console.log('Seed completed!');
  console.log('Credentials:');
  console.log('  Admin:     login=admin, password=admin123');
  console.log('  Organizer: login=organizer1, password=organizer123');
  console.log('  Student:   login=student1, password=student123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
