# subscriber.py
import zmq
import os

def start_subscriber():
    context = zmq.Context()
    socket = context.socket(zmq.SUB)
    socket.connect("tcp://127.0.0.1:5555")
    socket.setsockopt_string(zmq.SUBSCRIBE, "")  # Subscribe to all messages
    
    while True:
        message = socket.recv_string()
        print(f"Received: {message}")
        os.system(f"node index.js {message}") 

if __name__ == "__main__":
    start_subscriber()

