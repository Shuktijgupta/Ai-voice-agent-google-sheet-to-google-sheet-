import pandas as pd
from sqlalchemy import create_engine
import matplotlib.pyplot as plt
import os

# Connect to the SQLite database
# The database is in the parent directory
db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dev.db')
db_url = f'sqlite:///{db_path}'

print(f"Connecting to database at: {db_path}")

try:
    engine = create_engine(db_url)
    
    # Read calls data
    query_calls = "SELECT * FROM calls"
    df_calls = pd.read_sql(query_calls, engine)
    
    print("\n--- Call Data Summary ---")
    print(df_calls.info())
    print(df_calls.head())
    
    if not df_calls.empty:
        # Basic Analysis
        total_calls = len(df_calls)
        completed_calls = len(df_calls[df_calls['status'] == 'completed'])
        success_rate = (completed_calls / total_calls) * 100 if total_calls > 0 else 0
        
        print(f"\nTotal Calls: {total_calls}")
        print(f"Completed Calls: {completed_calls}")
        print(f"Success Rate: {success_rate:.2f}%")
        
        # Duration Analysis (if duration_seconds exists and is not null)
        if 'duration_seconds' in df_calls.columns:
            avg_duration = df_calls['duration_seconds'].mean()
            print(f"Average Call Duration: {avg_duration:.2f} seconds")

    # Read Interview Responses
    query_responses = "SELECT * FROM interview_responses"
    df_responses = pd.read_sql(query_responses, engine)
    
    print("\n--- Interview Responses Summary ---")
    print(df_responses.head())
    
    if not df_responses.empty:
        # Analyze answers by question
        print("\nResponse Distribution by Question:")
        print(df_responses.groupby('question_id')['answer_text'].value_counts())

except Exception as e:
    print(f"Error analyzing data: {e}")
    print("Make sure the database 'dev.db' exists and has some data.")
