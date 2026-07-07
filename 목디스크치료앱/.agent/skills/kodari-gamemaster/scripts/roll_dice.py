import random

def roll_d20():
    roll = random.randint(1, 20)
    if roll == 20:
        result = "CRITICAL SUCCESS"
    elif roll >= 10:
        result = "SUCCESS"
    elif roll >= 2:
        result = "FAILURE"
    else:
        result = "CRITICAL FAILURE"
    
    print(f"🎲 {roll} / {result}")

if __name__ == "__main__":
    roll_d20()
