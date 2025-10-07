
# Health Risk Survey API

A Node.js + Express backend for health risk profiling. It accepts user survey data in JSON, plain text, or image form, performs OCR with Tesseract.js, normalizes and validates the input, extracts risk factors, scores health risk, and generates safe, actionable lifestyle recommendations using the Google Gemini API (with local fallback).

## Features

-   **Multiple input formats**:
    -   JSON body
    -   Free text (e.g., “Age: 25, Smoker: yes”)
    -   Image upload with OCR extraction
-   **Data normalization**:
    -   Cleans and standardizes text using custom parsers.
    -   Detects missing fields and computes a confidence score.
-   **Risk analysis**:
    -   Simple risk scoring and classification: low, moderate, high.
    -   Factors: age, smoking, exercise, diet.
-   **Recommendations**:
    -   AI-powered (Gemini) short lifestyle suggestions.
    -   Safe fallback logic if the AI is unavailable.
-   **Clean API responses**:
    -   Well-formatted JSON responses ready for frontends, dashboards, or chatbots.

## Architecture

The API follows a pipeline architecture where a request is processed through several stages. A central controller manages the flow, calling on libraries for specific tasks like input normalization, risk scoring, and AI interaction.

The diagram below illustrates the flow of a request from the client to the final JSON response.

[Client Request] -> [Parse & Normalize] -> [Extract Factors] -> [Score Risk]->[Generate Recommendations] -> [JSON Response]
(Image/Text/JSON)      (Tesseract/JS)                           (Custom Logic)      (Gemini API / Fallback)


### Folder Structure

health-risk-profiler/
├── node_modules/
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── survey.controller.js
│   │   ├── lib/
│   │   │   ├── risk_logic.js
│   │   │   └── survey_normalize.js
│   │   └── routes/
│   │       └── health.routes.js
│   └── uploads/              # Temporary storage for OCR
├── .env                      # Environment variables
├── eng.traineddata           # Tesseract language data
├── index.js                  # Main server entry point
├── package-lock.json
├── package.json
└── Readme.md


## Tech Stack

-   **Backend**: Node.js, Express
-   **File Upload**: Multer
-   **OCR**: Tesseract.js
-   **Validation**: Zod (used within libraries)
-   **AI**: Google Generative AI (Gemini)
-   **Config**: Dotenv

## Setup and Installation

1.  **Clone the repository**
    ```bash
    git clone 
    cd health-risk-profiler
    ```
2.  **Install dependencies**
    ```bash
    npm install
    ```
3.  **Configure environment variables**
    Create a `.env` file in the root directory and add your API key:
    ```env
    GEMINI_API_KEY="your_gemini_api_key_here"
    ```
4.  **Run the server**
    ```bash
    npm run dev
    ```
    The server will start on `http://localhost:4000` by default.


    ## API Endpoints (Testing with Postman)

All endpoints are `POST` requests.

#### 1. Parse Input
-   **URL**: ` http://localhost:4000/api/health/parse`
-   **Description**: Normalizes input from JSON, text, or image and calculates a confidence score.
-   **Body**: (JSON Example) `raw` → `JSON`
    Input (text):
    {"age":42,"smoker":true,"exercise":"rarely","diet":"high sugar"}

    Input (image -> OCR sample):
    Age: 42
    Smoker: yes
    Exercise: rarely
    Diet: high sugar

    Expected Output (JSON):
     {
       "answers":{"age":42,"smoker":true,"exercise":"rarely","diet":"high sugar"},
       "missing_fields": [],
       "confidence": 0.92
     }


#### 2. Extract Factors
-   **URL**: `http://localhost:4000/api/health/factors`
-   **Description**: Extracts key risk factors from the provided data.
-   **Body**: 
 
     Expected Output (JSON):
    {
      "factors": ["smoking", "poor diet", "low exercise"],
      "confidence": 0.88
    }


#### 3. Classify Risk
-   **URL**: `http://localhost:4000/api/health/risk`
-   **Description**: Scores the overall health risk and provides a rationale.
-   **Body**: 
    
    Expected Output (JSON):
   {
   "risk_level": "high",
   "score": 78,
   "rationale": ["smoking", "high sugar diet", "low activity"]
   }


#### 4. Generate Recommendations
-   **URL**: `http://localhost:4000/api/health/recommendations`
-   **Description**: Generates actionable lifestyle recommendations.
-   **Body**: 
   
     Expected Output (JSON):
     {
     "risk_level": "high",
     "factors": ["smoking","poor diet","low exercise"],
     "recommendations": ["Quit smoking","Reduce sugar","Walk 30 mins daily"],
     "status":"ok"
     }


### Image Input (OCR)
-   **URL**: Use any of the endpoints above.
-   **Body**: Choose `form-data`.
    -   **Key**: `form` (or the key your multer instance is configured for)
    -   **Type**: `File`
    -   **Value**: Select an image containing Age/Smoker/Exercise/Diet info.




