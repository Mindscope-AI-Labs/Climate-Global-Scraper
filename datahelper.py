import os
import pandas as pd
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_experimental.agents.agent_toolkits.pandas.base import (
    create_pandas_dataframe_agent,
)

load_dotenv()

# Initialize LLM using Groq (same as main app)
selected_llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.1, api_key=os.getenv("GROQ_API_KEY"))

def clean_agent_output(raw_output) -> str:
    """Clean the agent output to remove verbose logging and extract final answer."""
    # Check for rate limit errors first
    if isinstance(raw_output, Exception) and "rate_limit" in str(raw_output).lower():
        return "🚫 API Rate Limit Exceeded. Please try again in a few minutes or upgrade your Groq account at https://console.groq.com/settings/billing"

    if isinstance(raw_output, dict):
        # Check for error in dict response
        if 'error' in raw_output:
            error_msg = raw_output.get('error', {}).get('message', 'Unknown error')
            if 'rate' in error_msg.lower() and 'limit' in error_msg.lower():
                return "🚫 API Rate Limit Exceeded. Please wait a few minutes or upgrade your account."
            return f"❌ Error: {error_msg}"
        # Common LangChain output format
        if 'output' in raw_output:
            final = raw_output['output']
        elif 'answer' in raw_output:
            final = raw_output['answer']
        elif 'message' in raw_output:
            final = raw_output['message']
        else:
            final = str(raw_output)
    else:
        final = str(raw_output)

    # Extract final answer from chain of thought if it's text
    if "Final Answer:" in final:
        final_answer = final.split("Final Answer:", 1)[1].strip()
        # Remove markdown code blocks if present
        if final_answer.startswith("```markdown") or final_answer.startswith("```"):
            final_answer = final_answer.split("```", 2)[1] if "```" in final_answer else final_answer
        return final_answer.strip()
    elif "The final answer is:" in final:
        return final.split("The final answer is:", 1)[1].strip()

    # For table responses, look for markdown table content
    if "|" in final:
        lines = [line.strip() for line in final.split('\n') if line.strip(' \t').startswith('|')]
        if lines:
            return '\n'.join(lines)

    # Return the output as-is, removing any verbose chain logging
    result = final.strip()
    return result

def summerize_csv(filename: str):
    """
    Load CSV and return a summary including:
    - sample rows
    - column descriptions
    - missing values
    - duplicate values
    - basic statistics
    """
    try:
        df = pd.read_csv(filename, low_memory=False)
    except Exception as e:
        return {
            "initial_data_sample": [],
            "column_descriptions": f"❌ Error loading CSV file: {str(e)}",
            "missing_values": "0",
            "duplicate_values": "0",
            "essential_metrics": {}
        }

    # Get missing values count (direct calculation, more reliable)
    missing_count = df.isnull().sum().sum()
    missing_values = f"There are {missing_count} missing values in this dataset"

    # Get duplicate rows count
    duplicates_count = df.duplicated().sum()
    duplicate_values = f"There are {duplicates_count} duplicate rows in this dataset"

    try:
        pandas_agent = create_pandas_dataframe_agent(
            llm=selected_llm,
            df=df,
            verbose=False,  # Set to False to reduce verbose logging
            allow_dangerous_code=True,
            agent_executor_kwargs={"handle_parsing_errors": "True"},
        )

        # Get column descriptions with cleaned output
        raw_column_desc = pandas_agent.invoke(
            "Create a table for dataset columns. Write a column name and column descriptions as a table format"
        )
        column_descriptions = clean_agent_output(raw_column_desc)
    except Exception as e:
        column_descriptions = clean_agent_output(e)  # Handle API errors

    data_summary = {
        "initial_data_sample": df.head().to_dict('records'),
        "column_descriptions": column_descriptions,
        "missing_values": missing_values,
        "duplicate_values": duplicate_values,
        "essential_metrics": df.describe().to_dict(),
    }

    return data_summary


def get_dataframe(filename: str):
    """Return dataframe from CSV file."""
    return pd.read_csv(filename, low_memory=False)


def analyze_trend(filename: str, variable: str):
    """
    Ask LLM to interpret the trend of a given variable.
    """
    try:
        df = pd.read_csv(filename, low_memory=False)
    except Exception as e:
        return f"❌ Error loading CSV file: {str(e)}"

    try:
        pandas_agent = create_pandas_dataframe_agent(
            llm=selected_llm,
            df=df,
            verbose=False,  # Clean output
            allow_dangerous_code=True,
            agent_executor_kwargs={"handle_parsing_errors": "True"},
        )

        raw_response = pandas_agent.invoke(
            f"Interpret the trend of this shortly: {variable}. "
            f"The rows of the dataset are historical."
        )

        return clean_agent_output(raw_response)
    except Exception as e:
        return clean_agent_output(e)  # Handle API errors gracefully


def ask_question(filename: str, question: str):
    """
    Ask freeform question about dataset using LLM.
    """
    try:
        df = pd.read_csv(filename, low_memory=False)
    except Exception as e:
        return f"❌ Error loading CSV file: {str(e)}"

    try:
        pandas_agent = create_pandas_dataframe_agent(
            llm=selected_llm,
            df=df,
            verbose=False,  # Clean output
            allow_dangerous_code=True,
            agent_executor_kwargs={"handle_parsing_errors": "True"},
        )

        raw_response = pandas_agent.invoke(question)
        return clean_agent_output(raw_response)
    except Exception as e:
        return clean_agent_output(e)  # Handle API errors gracefully
