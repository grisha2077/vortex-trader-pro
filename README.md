# VortexTrader PRO

Advanced Binance Futures trading bot with React UI, real-time monitoring, and automated trading capabilities.

## Features

- Real-time trading interface
- Automated trading strategies
- RSI-based signal generation
- Position management
- Risk management
- Real-time monitoring dashboard
- API documentation
- Comprehensive testing suite

## Prerequisites

- Node.js (v14 or higher)
- Redis server
- Git
- Binance API credentials

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd vortextrader-pro
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
```

4. Start Redis server:

```bash
# Windows
redis-server

# Linux/Mac
sudo service redis-server start
```

5. Create required directories:

```bash
mkdir -p logs config/backups
```

## Development

1. Start the development server:

```bash
npm run dev
```

2. Start the React development server:

```bash
npm run client
```

3. Run tests:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run end-to-end tests
npm run test:e2e
```

## Production Build

1. Build the React application:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

## Accessing the Application

- Main application: http://localhost:3000
- API Documentation: http://localhost:3000/api-docs
- Monitoring Dashboard: http://localhost:3000/monitoring

## Project Structure

```
vortextrader-pro/
├── src/
│   ├── components/         # React components
│   ├── utils/             # Utility functions
│   ├── mocks/             # Mock data for testing
│   ├── __tests__/         # Test files
│   ├── App.jsx            # Main React component
│   ├── server.js          # Express server
│   └── server-entry.js    # Server entry point
├── public/                # Static files
├── logs/                  # Application logs
├── config/               # Configuration files
├── __mocks__/            # Jest mocks
├── .env                  # Environment variables
├── .env.example         # Example environment variables
├── package.json         # Project dependencies
├── jest.config.js       # Jest configuration
└── babel.config.js      # Babel configuration
```

## Testing

The project includes:

- Unit tests with Jest
- Component tests with React Testing Library
- End-to-end tests with Cypress
- API mocking with MSW

## Monitoring

The application includes:

- Real-time system metrics
- Health status monitoring
- Performance tracking
- Error logging

## Security

- Rate limiting
- Input validation
- Session management
- Secure cookie handling
- API key protection

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.
