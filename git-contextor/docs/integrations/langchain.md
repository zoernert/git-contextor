# Git Contextor - LangChain Integration

[LangChain](https://www.langchain.com/) is a popular framework for developing applications powered by language models. Git Contextor can act as a powerful, repository-aware knowledge source for LangChain applications.

The primary integration point is to use Git Contextor as a custom **Retriever**.

## Custom LangChain Retriever

A retriever is a component that, given a query, returns relevant documents. Here's how you can create a custom retriever that calls the Git Contextor API.

### Prerequisites

- Git Contextor running with its API accessible.
- Your Git Contextor API key.
- Python with `langchain` and `requests` packages installed.

### Python Implementation

Below is a sample implementation of a `BaseRetriever` for LangChain that queries your Git Contextor instance.

```python
import requests
from typing import List
from langchain_core.retrievers import BaseRetriever
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document

class GitContextorRetriever(BaseRetriever):
    """
    A custom retriever for LangChain that fetches context from a running
    Git Contextor instance.
    """
    api_url: str = "http://localhost:3000/api/search"
    api_key: str
    max_tokens: int = 2048

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> List[Document]:
        """
        Get documents from the Git Contextor API.
        """
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "query": query,
            "max_tokens": self.max_tokens,
        }
        
        try:
            response = requests.post(self.api_url, headers=headers, json=payload)
            response.raise_for_status() # Raise an exception for bad status codes
            
            # The API returns a single string of optimized context.
            # We wrap it in a LangChain Document.
            context_string = response.json().get("context", "")
            if not context_string:
                return []
            
            return [Document(page_content=context_string)]
            
        except requests.exceptions.RequestException as e:
            print(f"Error calling Git Contextor API: {e}")
            return []

# --- Example Usage ---
if __name__ == "__main__":
    # Remember to replace with your actual API key
    GIT_CONTEXTOR_API_KEY = "gctx_..." 

    retriever = GitContextorRetriever(api_key=GIT_CONTEXTOR_API_KEY)
    
    query = "how is user authentication implemented?"
    documents = retriever.invoke(query)
    
    if documents:
        print("--- Retrieved Context ---")
        print(documents[0].page_content)
    else:
        print("No context retrieved.")

```

### Using in a Chain

Once you have the retriever, you can easily use it in a Retrieval-Augmented Generation (RAG) chain.

```python
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

# Assuming 'retriever' is the GitContextorRetriever instance from above
# and you have set up your LLM
# llm = ChatOpenAI(model="gpt-4-turbo-preview") 

# rag_chain = (
#     {"context": retriever, "question": RunnablePassthrough()} 
#     | prompt_template # Your prompt template here
#     | llm
#     | StrOutputParser()
# )

# # Now you can invoke the chain with a question
# result = rag_chain.invoke("What's the database schema for products?")
# print(result)
```

This setup allows LangChain to use your entire repository as a dynamic, real-time knowledge base for your LLM applications.
