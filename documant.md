

####    THINGS I LEANT FROM THIS PROJECT

# I lant how harkers can crach you web by making some html dengerios injection, like sending some of the html reserved charaters.

# async/await: this functions is used when your web has a proccess that might take time, (API Request, or any other). normaly, any proccess that takes time in you page will make the whole site freeze , animations will stop still the proccess complate. but with use of async/await, the process can be running while other thing are working, and be waithing for the process to complate


### CONNECTING THE AI MODEL
***installing the SDK
in the project, i want to use gemini model, so i need to install the package(SDK) by running (pip install -U google-genai)

***
now we need to import it (from google import genai)

***
craete an environmental variavle file (.env).
python can't just read the .env file directly, so we need to install a package (python-dotenv)that help python read the file. 
-  (pip install python-dotenv),
then i need to import it in my python code
- (from dotenv import load_dotenv /n load_dotenv() )

== i need to import (os), because .env is stored in your local system, so os helps you read the operating system.

***
READ .ENV VALUE
i use (client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))).
so by the help of os, we get the value
.Client = is a gemini function

***
SENDING MASSAGE TO THE LLM
