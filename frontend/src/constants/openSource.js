export const GITHUB_REPO_URL = 'https://github.com/atozasworks/umnaapp-map'

export const GITHUB_CLONE_URL = 'https://github.com/atozasworks/umnaapp-map.git'

export const devSetupSteps = [
  {
    title: 'Clone the repository',
    code: `git clone ${GITHUB_CLONE_URL}\ncd umnaapp-map`,
  },
  {
    title: 'Install dependencies',
    code: 'npm install\nnpm run install:all',
  },
  {
    title: 'Configure environment',
    code: 'cp .env.example .env\ncp backend/.env.example backend/.env\ncp frontend/.env.example frontend/.env',
  },
  {
    title: 'Start the app',
    code: 'npm run dev',
    note: 'Frontend: http://localhost:3000 · Backend API: http://localhost:5001',
  },
]

export const prerequisites = [
  'Node.js 18+ and npm',
  'Git',
  'Docker & Docker Compose',
  'PostgreSQL (or via Docker)',
]

export const techStack = [
  'React + Vite + Tailwind CSS',
  'Node.js + Express + Socket.IO',
  'PostgreSQL + PostGIS + Prisma',
  'MapLibre GL, OSRM, Nominatim',
]
