# Clean up existing files
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules
Remove-Item -Force -ErrorAction SilentlyContinue package-lock.json
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue build

# Create necessary directories if they don't exist
New-Item -ItemType Directory -Force -Path public
New-Item -ItemType Directory -Force -Path src

# First install react-scripts and core React dependencies
npm install --save react-scripts@5.0.1 react@18.2.0 react-dom@18.2.0 typescript@4.9.5 web-vitals@3.5.2 --legacy-peer-deps

# Install plotly dependencies first (specific versions)
npm install --save plotly.js-dist@2.27.1 --legacy-peer-deps
npm install --save react-plotly.js@2.6.0 --legacy-peer-deps

# Install ajv and related dependencies
npm install --save ajv@8.12.0 ajv-keywords@5.1.0 --legacy-peer-deps

# Install the rest of the dependencies
npm install --save @emotion/react@11.11.3 @emotion/styled@11.11.0 @mui/icons-material@5.15.10 @mui/material@5.15.10 binance-api-node@0.12.7 compression@1.7.4 cors@2.8.5 dotenv@16.4.4 express@4.18.2 morgan@1.10.0 socket.io@4.7.4 socket.io-client@4.7.4 technicalindicators@3.1.0 winston@3.11.0 winston-daily-rotate-file@4.7.1 --legacy-peer-deps

# Install dev dependencies
npm install --save-dev nodemon@3.0.3 eslint@8.56.0 eslint-plugin-react@7.33.2 --legacy-peer-deps

# Create a temporary .env file if it doesn't exist
if (-not(Test-Path .env)) {
    Copy-Item -Path keys.env -Destination .env -ErrorAction SilentlyContinue
}

Write-Host "Installing dependencies completed. Building React app..."

# Build the React app
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "React app built successfully!"
    Write-Host "Setup completed! You can now run .\start.bat to start the application."
} else {
    Write-Host "Failed to build React app. Please check the error messages above."
    exit 1
} 