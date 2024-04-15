import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { useSocketContext } from "./Context/SocketContext";
import ReactPlayer from "react-player";

function App() {
  const { socketid, socket, createoffer, createanswer, setanswer, peer } =
    useSocketContext();
  const [idtocall, setidtocall] = useState<string>("");
  const [username, setusername] = useState<string>("");
  const [caller, setcaller] = useState<string>("");
  const [callAccepted, setcallAccepted] = useState<boolean>(false);
  const [incomingcall, setincomingcall] = useState<boolean>(false);
  const [remotestream, setremotestream] = useState<MediaStream>();
  const [mediareceived,setmediareceived]=useState<boolean>(false)
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
    if (peer && !mediareceived) {
      setmediareceived(true);
      peer.addEventListener("track", (event) => {
        console.log(event.streams);
        setremotestream(event.streams[0]);
        remotevideo.current.srcObject = event.streams[0];
      });
    }
  }, [peer, mediareceived]);

  const handleincomingcall = async (data: any) => {
    if (mystream && !incomingcall) {
      setincomingcall(true);
      setcaller(data.from);

      //creating an answer to respond to the caller
      const answer = await createanswer(mystream, data.signal);
      socket?.emit("answer-call", { to: data.from, ans: answer });
    }
  };

  const handlecallaccepted = (data: any) => {
    if (!callAccepted) {
      setanswer(data);
      setcallAccepted(true);
    }
  };
  //listening to call-accepted event
  useEffect(() => {
    socket?.on("incoming-call", handleincomingcall);
    socket?.on("call-accepted", handlecallaccepted);
    return () => {
      socket?.off("incoming-call", handleincomingcall);
      socket?.off("call-accepted", handlecallaccepted);
    };
  }, [socket, callAccepted, mystream, incomingcall]);




  //    Negotitation Part 

  const handlenegoneeded = useCallback(async () => {
    //@ts-ignore
    const offer = await createoffer(mystream);
    console.log("nego needed");

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
    await setanswer(data.answer);
  }, []);

  useEffect(() => {
    socket?.on("peer:nego:needed", handleincomingnegotiation);
    socket?.on("nego:final", handlefinalnegotiation);

    return () => {
      socket?.off("peer:nego:needed", handleincomingnegotiation);
      socket?.off("nego:final", handlefinalnegotiation);
    };
  }, [socket, handlefinalnegotiation, handleincomingnegotiation]);

  return (
    <>
      <div className="w-full h-screen flex">
        <video className="w-1/2 h-80" autoPlay muted ref={myvideo}></video>
        <video className="w-1/2 h-96" autoPlay muted ref={remotevideo}></video>
        {/* <ReactPlayer playing muted height="300px" width="300px" url={remotestream}></ReactPlayer> */}
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



  //Listening to the incoming media track from the remote user
  // useEffect(() => {
  //   peer?.addEventListener("track", (ev: RTCTrackEvent) => {
  //     const remotestream = ev.streams[0];
  //     console.log("Got tracks", ev.streams[0]);
  //     setremotestream(remotestream);
  //   });

  // //   return () => {
  // //     peer?.removeEventListener("track", (ev: RTCTrackEvent) => {
  // //       const remotestream = ev.streams[0];
  // //       console.log("Got tracks", ev.streams[0]);
  // //       setremotestream(remotestream);
  // //     });
  // //   };
  // // }, [peer]);