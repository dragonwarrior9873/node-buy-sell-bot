# publisher.py
import zmq

def start_publisher():
    context = zmq.Context()
    socket = context.socket(zmq.PUB)
    socket.bind("tcp://127.0.0.1:5555")
    
    while True:
        message = input("Enter your message: ")
        socket.send_string(message)
        print(f"Sent: {message}")

if __name__ == "__main__":
    start_publisher()
