# Project Folder Structure

```
maptest/
├── backend/                          # Node.js/Express Backend
│   ├── config/                      # Configuration files
│   │   ├── atozasAuth.js           # Atozas authentication config
│   │   ├── database.js             # Prisma client
│   │   └── passport.js             # Passport.js config
│   ├── controllers/                 # Request controllers
│   │   └── authController.js       # Authentication controller
│   ├── middleware/                  # Express middleware
│   │   ├── auth.js                 # JWT authentication
│   │   ├── cache.js                # Redis caching middleware
│   │   ├── rateLimit.js            # Rate limiting middleware
│   │   └── socketAuth.js           # WebSocket authentication
│   ├── prisma/                      # Prisma ORM
│   │   ├── migrations/             # Database migrations
│   │   └── schema.prisma           # Database schema
│   ├── routes/                      # API routes
│   │   ├── authRoutes.js           # Authentication routes
│   │   ├── atozasAuthRoutes.js     # Atozas auth routes
│   │   ├── mapRoutes.js            # Map services (routing, search, geocoding)
│   │   ├── testRoutes.js           # Test routes
│   │   └── vehicleRoutes.js        # Vehicle management routes
│   ├── utils/                       # Utility functions
│   │   └── jwt.js                  # JWT utilities
│   ├── Dockerfile                  # Docker image for backend
│   ├── package.json                # Backend dependencies
│   ├── server.js                   # Express server entry point
│   └── .env.example                # Backend environment template
│
├── frontend/                        # React Frontend
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── MapComponent.jsx    # Main map component (MapLibre GL)
│   │   │   ├── ProtectedRoute.jsx  # Route protection
│   │   │   ├── RoutePanel.jsx      # Route calculation panel
│   │   │   └── SearchBar.jsx       # Place search component
│   │   ├── contexts/                # React contexts
│   │   │   ├── AuthContext.jsx      # Authentication context
│   │   │   ├── AtozasAuthContext.jsx # Atozas auth context
│   │   │   └── SocketContext.jsx   # WebSocket context
│   │   ├── hooks/                   # Custom React hooks
│   │   │   └── useAtozasAuth.js    # Atozas auth hook
│   │   ├── lib/                     # Library files
│   │   │   └── atozas-auth-kit.jsx # Atozas auth library
│   │   ├── pages/                   # Page components
│   │   │   ├── HomePage.jsx         # Main map page
│   │   │   ├── LandingPage.jsx      # Landing page
│   │   │   ├── LoginPage.jsx        # Login page
│   │   │   ├── LoginPageAtozas.jsx  # Atozas login
│   │   │   ├── OTPVerificationPage.jsx # OTP verification
│   │   │   └── RegisterPage.jsx    # Registration page
│   │   ├── services/                # API services
│   │   │   └── api.js              # Axios API client
│   │   ├── App.jsx                  # Main app component
│   │   ├── index.css                # Global styles
│   │   └── main.jsx                 # React entry point
│   ├── index.html                   # HTML template
│   ├── package.json                 # Frontend dependencies
│   ├── postcss.config.js            # PostCSS config
│   ├── tailwind.config.js           # Tailwind CSS config
│   ├── vite.config.js               # Vite config
│   └── .env.example                 # Frontend environment template
│
├── nginx/                           # Nginx Configuration
│   ├── nginx.conf                   # Nginx reverse proxy config
│   └── ssl/                         # SSL certificates (production)
│
├── osrm-data/                       # OSRM Routing Data
│   └── india-latest.osrm           # Processed OSRM data files
│
├── tiles/                           # Map Tile Files
│   └── india.mbtiles               # Map tiles in MBTiles format
│
├── docker-compose.yml               # Docker Compose orchestration
├── init-db.sql                      # PostgreSQL initialization
├── tileserver-config.json           # TileServer GL configuration
│
├── API_EXAMPLES.md                  # API usage examples
├── FOLDER_STRUCTURE.md              # This file
├── GPS_TRACKING_IMPLEMENTATION.md   # GPS tracking documentation
├── README.md                        # Main project README
└── SETUP_GUIDE.md                   # Detailed setup instructions
```

## Key Directories

### Backend (`backend/`)
- **routes/**: API endpoint definitions
  - `mapRoutes.js`: Routing, search, reverse geocoding
  - `vehicleRoutes.js`: Vehicle CRUD operations
- **middleware/**: Express middleware
  - `cache.js`: Redis caching
  - `rateLimit.js`: Rate limiting
- **prisma/**: Database schema and migrations

### Frontend (`frontend/`)
- **components/**: Reusable React components
  - `MapComponent.jsx`: Main map with MapLibre GL
  - `SearchBar.jsx`: Place search interface
  - `RoutePanel.jsx`: Route calculation UI
- **pages/**: Page-level components
  - `HomePage.jsx`: Main map page with all features

### Configuration Files
- `docker-compose.yml`: Orchestrates all services
- `tileserver-config.json`: TileServer GL configuration
- `nginx/nginx.conf`: Reverse proxy configuration

### Data Directories
- `osrm-data/`: OSRM routing data (generated from OSM)
- `tiles/`: Map tile files (.mbtiles format)

## Environment Files

Create these from examples:
- `.env` (root): Docker Compose environment
- `backend/.env`: Backend service environment
- `frontend/.env`: Frontend build environment

## Service Ports

- **Frontend**: 3000 (dev) / 80 (production via Nginx)
- **Backend API**: 5001
- **TileServer**: 8080
- **OSRM**: 5000
- **Nominatim**: 8081
- **PostgreSQL**: 5432
- **Redis**: 6379
- **Nginx**: 80, 443

