# Windows Installation Guide

## Prerequisites

1. **Node.js Installation**

   - Download Node.js from https://nodejs.org/
   - Choose the LTS (Long Term Support) version
   - Run the installer and follow the installation steps
   - Verify installation by opening Command Prompt and typing:
     ```
     node --version
     npm --version
     ```

2. **Binance API Keys**
   - Log in to your Binance account
   - Go to API Management
   - Create a new API key with Futures trading enabled
   - Save both the API Key and Secret Key

## Installation Steps

1. **Download the Bot**

   - Download or clone the repository to your computer
   - Extract the files to a folder (e.g., `C:\VortexTrader`)

2. **Configure API Keys**

   - Copy `.env.example` to `.env`
   - Open `.env` in Notepad or any text editor
   - Replace `your_api_key_here` with your Binance API Key
   - Replace `your_api_secret_here` with your Binance Secret Key
   - Save the file

3. **First Run**

   - Double-click `start.bat`
   - The script will:
     - Check if Node.js is installed
     - Verify the .env file exists
     - Install required dependencies
     - Start the trading bot

4. **Access the Interface**
   - Open your web browser
   - Go to `http://localhost:3000`
   - You should see the trading interface

## Running the Bot

### Normal Start

- Double-click `start.bat`

### With Custom Settings

- Right-click `start.bat`
- Select "Edit"
- Add command line arguments after `node src/index.js`, for example:
  ```
  node src/index.js --testnet --symbol ETHUSDT --port 3000
  ```
- Save and run the batch file

### Command Line Arguments

- `--testnet` or `-t`: Use Binance testnet
- `--symbol` or `-s`: Trading pair (default: BTCUSDT)
- `--port` or `-p`: Server port (default: 3000)

## Troubleshooting

1. **Node.js Not Found**

   - Make sure Node.js is installed
   - Try restarting your computer
   - Verify Node.js is in your system PATH

2. **Dependencies Installation Failed**

   - Check your internet connection
   - Try running Command Prompt as Administrator
   - Run `npm install` manually

3. **API Connection Issues**

   - Verify your API keys in `.env`
   - Check if you have Futures trading enabled
   - Ensure your IP is not restricted

4. **Web Interface Not Loading**
   - Make sure port 3000 is not in use
   - Try a different port using `--port`
   - Check if your firewall is blocking the connection

## Security Notes

- Never share your `.env` file
- Keep your API keys secure
- Use testnet for testing
- Start with small position sizes
- Monitor the bot regularly

## Support

For issues or questions:

1. Check the logs in the `logs` folder
2. Review the README.md file
3. Check the error messages in the web interface
