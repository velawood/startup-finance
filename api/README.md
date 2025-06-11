# Cap Table Extractor API

A FastAPI-based service that extracts structured cap table data from PDF documents using AI (pydantic-ai with OpenAI GPT-4).

## Features

- Extract SAFE investments from PDF documents
- Extract common stockholders and their vesting schedules
- Extract option pool information
- Extract priced round details (Series A, B, etc.)
- Returns data in a structured JSON format compatible with the frontend import

## Setup

### 1. Install Dependencies

```bash
cd api
pip install -r requirements.txt
```

### 2. Configure OpenAI API Key

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Then edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=your_actual_api_key_here
```

### 3. Run the API

```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check
- **GET** `/`
- Returns API status

### Extract from PDF
- **POST** `/extract-pdf`
- Upload a PDF file to extract cap table data
- Optional: Include `company_name` in form data

Example using curl:
```bash
curl -X POST "http://localhost:8000/extract-pdf" \
  -F "file=@your_safe_document.pdf" \
  -F "company_name=Your Startup Inc"
```

### Extract from Text (Testing)
- **POST** `/extract-text`
- Send plain text to extract cap table data
- Useful for testing without PDFs

### Sample Output
- **GET** `/sample-output`
- Returns a sample of the expected output format

## Output Format

The API returns data in the following structure:

```json
{
  "version": "1.0",
  "metadata": {
    "companyName": "Example Startup Inc.",
    "dateGenerated": "2025-01-06T12:00:00",
    "source": "documents",
    "extractionConfidence": {
      "overall": 85.0,
      "details": {
        "safes": 90.0,
        "commonStock": 85.0,
        "options": 80.0,
        "pricedRounds": 85.0
      }
    }
  },
  "capTable": {
    "commonStock": [...],
    "options": {...},
    "safes": [...],
    "pricedRounds": [...]
  },
  "extractionNotes": [...]
}
```

## Usage with Frontend

1. Upload a PDF to the API endpoint
2. Copy the returned JSON
3. Paste it into the Import Modal in the frontend app
4. The frontend will validate and import the data

## Development

### Interactive API Documentation

When running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Adding New Extraction Capabilities

To extract additional document types:

1. Add new Pydantic models in `models.py`
2. Create new extraction prompts in `extractor.py`
3. Add corresponding agents in the `CapTableExtractor` class
4. Update the extraction logic in `extract_cap_table_from_text`

## Troubleshooting

### Common Issues

1. **Import errors**: Make sure all dependencies are installed
2. **OpenAI API errors**: Check your API key is valid and has credits
3. **PDF extraction errors**: Ensure the PDF contains text (not just images)

### Debugging

Set environment variable for more logging:
```bash
export PYTHONUNBUFFERED=1
```

## Production Considerations

1. Replace `allow_origins=["*"]` in CORS settings with your actual frontend URL
2. Use environment variables for all configuration
3. Add rate limiting for API endpoints
4. Implement proper error handling and logging
5. Consider caching extraction results
