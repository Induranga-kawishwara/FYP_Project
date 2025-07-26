# ShopFinder

ShopFinder is a dynamic and responsive web application designed to help users discover local shops and businesses with ease. Users can search for stores based on their location, view them on an interactive map, and get essential details like addresses, operating hours, and user reviews.

## Features

- **Interactive Map View**: Utilizes a map interface (e.g., Google Maps or Mapbox) to display shop locations.
- **Geolocation & Search**: Find shops near your current location or search by address or zip code.
- **Shop Categories**: Filter shops by categories such as "Grocery", "Electronics", "Restaurant", etc.
- **Detailed Information**: View shop details including address, phone number, website, and opening hours.
- **User Authentication**: Secure sign-up and login functionality for users.
- **User Contributions**: Registered users can add new shops, post reviews, and rate existing ones.
- **Responsive Design**: Fully functional on both desktop and mobile devices.

## Tech Stack

- **Frontend**: React, CSS3, HTML5, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Mapping**: Mapbox GL JS / Google Maps API
- **Authentication**: JSON Web Tokens (JWT)
- **Deployment**: Vercel

## Installation

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js and npm
- MongoDB
- Git

### Setup

1.  **Clone the repository:**

    ```sh
    git clone https://github.com/your_username/ShopFinder.git
    cd ShopFinder
    ```

2.  **Install backend dependencies:**

    ```sh
    npm install
    ```

3.  **Install frontend dependencies:**

    ```sh
    cd client
    npm install
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the root directory and add the following:

    ```env
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    MAPBOX_API_TOKEN=your_mapbox_api_token
    ```

5.  **Run the application:**
    From the root directory, run the development server:
    ```sh
    npm run dev
    ```
    This will start both the backend and frontend servers concurrently.

## Usage

- Open your browser and navigate to `http://localhost:3000`.
- Sign up for a new account or log in if you already have one.
- Use the search bar to find shops by name or location.
- Click on a map marker to see a quick summary of a shop.
- Click on a shop from the list to view its detailed information page.
- Add a new shop or review an existing one.
