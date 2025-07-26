import google.generativeai as genai
import ast
import json
from PIL import Image
from constants import GEMINI_API_KEY

genai.configure(api_key=GEMINI_API_KEY)

def analyze_image(img: Image, dict_of_vars: dict):
    model = genai.GenerativeModel(model_name="gemini-1.5-flash")
    dict_of_vars_str = json.dumps(dict_of_vars, ensure_ascii=False)

    prompt = (
        "You have been given an image with some mathematical expressions, equations, or graphical problems, and you need to solve them.\n"
        "Note: Use the PEMDAS rule for solving mathematical expressions. PEMDAS stands for the Priority Order: Parentheses, Exponents, Multiplication and Division (from left to right), Addition and Subtraction (from left to right).\n"
        "For example:\n"
        "Q. 2 + 3 * 4\n"
        "(3 * 4) => 12, 2 + 12 = 14.\n"
        "Q. 2 + 3 + 5 * 4 - 8 / 2\n"
        "5 * 4 => 20, 8 / 2 => 4, 2 + 3 => 5, 5 + 20 => 25, 25 - 4 => 21.\n"
        "\n"
        "YOU CAN HAVE FOUR TYPES OF EQUATIONS/EXPRESSIONS IN THIS IMAGE, AND ONLY ONE CASE SHALL APPLY EVERY TIME:\n"
        "Following are the cases:\n"
        "1. Simple mathematical expressions like 2 + 2, 3 * 4, 5 / 6, 7 - 8, etc.:\n"
        "   In this case, solve and return the answer in the format of a LIST OF ONE DICT:\n"
        "   [{\"expr\": \"given expression\", \"result\": calculated answer}]\n"
        "\n"
        "2. Set of Equations like x^2 + 2x + 1 = 0, 3y + 4x = 0, 5x^2 + 6y + 7 = 12, etc.:\n"
        "   In this case, solve for the given variable(s), and return a COMMA-SEPARATED LIST OF DICTS:\n"
        "   e.g., {\"expr\": \"x\", \"result\": 2, \"assign\": true}, {\"expr\": \"y\", \"result\": 5, \"assign\": true}\n"
        "\n"
        "3. Assigning values to variables like x = 4, y = 5, z = 6, etc.:\n"
        "   In this case, assign values and return:\n"
        "   [{\"expr\": \"x\", \"result\": 4, \"assign\": true}, {\"expr\": \"y\", \"result\": 5, \"assign\": true}]\n"
        "\n"
        "4. Analyzing Graphical Math problems represented in drawing form:\n"
        "   These may include diagrams of cars colliding, triangle problems, motion, cricket charts, etc.\n"
        "   PAY ATTENTION TO COLORS.\n"
        "   Return in the format: [{\"expr\": \"summary of the problem\", \"result\": calculated value}]\n"
        "\n"
        "Make sure to use extra backslashes for escape characters like \\f -> \\\\f, \\n -> \\\\n, etc.\n"
        "Here is a dictionary of user-assigned variables. If the expression has any of these variables, use its value:\n"
        f"{dict_of_vars_str}\n"
        "DO NOT USE BACKTICKS OR MARKDOWN FORMATTING.\n"
        "PROPERLY QUOTE ALL KEYS AND VALUES FOR EASY PARSING WITH ast.literal_eval.\n"
)


    response = model.generate_content([prompt, img])
    print("Raw response from Gemini:\n", response.text)

    def clean_response(text):
        lines = text.strip().splitlines()
        # Remove markdown code block markers if present
        if lines and lines[0].startswith('```'):
            lines = lines[1:]
            if lines and lines[-1].startswith('```'):
                lines = lines[:-1]
        return '\n'.join(lines)

    answers = []
    cleaned_text = clean_response(response.text)
    try:
        answers = ast.literal_eval(cleaned_text)
    except Exception as e:
        print("AST parsing failed:", e)
        try:
            answers = json.loads(cleaned_text)
        except Exception as e2:
            print("JSON parsing also failed:", e2)
            answers = []

    print("Returned answer:", answers)

    for answer in answers:
        if 'assign' in answer:
            answer['assign'] = True
        else:
            answer['assign'] = False

    return answers
