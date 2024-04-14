import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Socket, io } from "socket.io-client";

interface typeSocketcontext {
  socketid: string;
  socket: Socket | null;
  createoffer: (
    ref: MediaStream,
    mystream: MediaStream
  ) => Promise<RTCSessionDescriptionInit> | null;
  createanswer: (
   
    mystream: MediaStream,
    signal: RTCSessionDescriptionInit
  ) => Promise<RTCSessionDescriptionInit> | null;
  setanswer: (ans: any) => Promise<void> | null;
  peer: RTCPeerConnection | null;
}
const Socketcontext = createContext<typeSocketcontext>({
  socketid: "",
  socket: null,
  createoffer: () => null,
  createanswer: () => null,
  setanswer: () => null,
  peer: null,
});
export const useSocketContext = () => {
  return useContext(Socketcontext);
};

export const SocketcontextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [socketid, setsocketid] = useState("");
  const [socket, setsocket] = useState<Socket | null>(null);
  const server = {
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun.global.twilio.com:3478",
        ],
      },
    ],
  };

  useEffect(() => {
    const connectSocket = async () => {
      try {
        const newSocket = io("http://localhost:5000");
        setsocket(newSocket);
        newSocket.on("me", (id) => {
          setsocketid(id);

          return () => {
            newSocket.disconnect();
          };
        });
      } catch (error) {
        console.error("Error connecting socket:", error);
      }
    };

    connectSocket();
  }, []);

  const peer = new RTCPeerConnection(server);

  const createoffer = async (mystream: MediaStream) => {
    if (mystream) {
      mystream.getTracks().forEach((track) => {
        peer.addTrack(track, mystream);
      });
    }

    

    const offer = await peer.createOffer();
    await peer.setLocalDescription(new RTCSessionDescription(offer));

    return offer;
  };

  const createanswer = async (
    mystream: MediaStream,
    signal: RTCSessionDescriptionInit
  ) => {
   
    if (mystream) {
      mystream.getTracks().forEach((track) => {
        peer.addTrack(track, mystream);
      });
    }

   
    await peer.setRemoteDescription(new RTCSessionDescription(signal));

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(new RTCSessionDescription(answer));

    return answer;
  };

  const setanswer = async (ans: any) => {
    await peer.setRemoteDescription(new RTCSessionDescription(ans));
  };

  return (
    <Socketcontext.Provider
      value={{ socketid, socket, createoffer, createanswer, setanswer, peer }}
    >
      {children}
    </Socketcontext.Provider>
  );
};
