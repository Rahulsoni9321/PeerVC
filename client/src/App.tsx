import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { useSocketContext } from "./Context/SocketContext";

function App() {
  const { socketid, socket, createoffer, createanswer, setanswer, peer } =
    useSocketContext();
  const [idtocall, setidtocall] = useState<string>("");
  const [username, setusername] = useState<string>("");
  const [caller, setcaller] = useState<string>("");
  const [callAccepted, setcallAccepted] = useState<boolean>(false);
  const [incomingcall, setincomingcall] = useState<boolean>(false);
  const [remotestream, setremotestream] = useState<MediaStream>();
  const [mystream, setmystream] = useState<MediaStream>();
  const myvideo: any = useRef();
  const remotevideo: any = useRef();

  useEffect(() => {
    async function getuserstream() {
      //getting our media (audio and video)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setmystream(stream);
      myvideo.current.srcObject = stream;
    }
    getuserstream();
  }, []);

  //triggers after hitting the call button
  const handlecall = () => {
    async function creatingoffer() {
      if (mystream) {
        //creating an offer(sdp) before sending it to the user
        const offer = await createoffer(
          remotevideo.current.srcObject,
          mystream
        );
        socket?.emit("call-user", {
          from: socketid,
          signal: offer,
          to: idtocall,
          name: username,
        });
      }
    }
    creatingoffer();
  };


  //lsitening to incoming call event

  useEffect(() => {
    socket?.on("incoming-call", async (data) => {
      if (mystream && !incomingcall) {
        setincomingcall(true);

        //creating an answer to respond to the caller
        const answer = await createanswer(mystream, data.signal);
        setcaller(data.from);
        socket.emit("answer-call", { to: data.from, ans: answer });
      }
    });
  }, [mystream, incomingcall]);


  //listening to call-accepted event
  useEffect(() => {
    socket?.on("call-accepted", (data) => {
      if (!callAccepted) {
        setanswer(data);
        setcallAccepted(true);
      }
    });
    return () => {
      socket?.off("call-accepted");
    };
  }, [socket, callAccepted]);


  //Listening to the incoming media track from the remote user
  useEffect(() => {
    peer?.addEventListener("track", (ev: RTCTrackEvent) => {
      const remotestream = ev.streams[0];
      setremotestream(remotestream);
      console.log("Got tracks", ev.streams[0]);
      remotevideo.current.srcObject = remotestream;
    });
  }, []);

  const handlenegoneeded = useCallback(async () => {
    console.log("handle nego");
    //@ts-ignore
    const offer = await createoffer(remotevideo.current.srcObject, mystream);
    console.log(offer);
    console.log(caller);
    socket?.emit("nego:needed", { signal: offer, to: caller });
  }, [mystream, caller]);


  //handle the negotiation event

  useEffect(() => {
    peer?.addEventListener("negotiationneeded", handlenegoneeded);
    return () => {
      peer?.removeEventListener("negotiationneeded", handlenegoneeded);
    };
  }, [handlenegoneeded]);

  const handleincomingnegotiation = useCallback(
    async (data: any) => {
      if (mystream) {
        console.log("handle incomingnego");

        const answer = await createanswer(mystream, data.offer);
        socket?.emit("nego:done", { to: data.from, ans: answer });
      }
    },
    [mystream]
  );

  const handlefinalnegotiation = useCallback(async (data: any) => {
    console.log("handlecallfinal final nego");
    await setanswer(data.ans);
  }, []);

  socket?.on("peer:nego:needed", handleincomingnegotiation);
  socket?.on("nego:final", handlefinalnegotiation);

  return (
    <>
      <div className="w-full h-screen flex">
        <video className="w-1/2 h-80" autoPlay muted ref={myvideo}></video>
        <video className="w-1/2 h-96" autoPlay muted ref={remotevideo}></video>
      </div>
      <input
        type="text"
        placeholder="enter id to call"
        onChange={(e) => {
          setidtocall(e.target.value);
        }}
      ></input>
      <input
        type="text"
        placeholder="Enter your username"
        onChange={(e) => {
          setusername(e.target.value);
        }}
      ></input>
      <button onClick={handlecall}>Call</button>
      <div>{socketid}</div>
      <div>{caller}</div>
    </>
  );
}

export default App;
