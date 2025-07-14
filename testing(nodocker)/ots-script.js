   // =============== CLOCK ===============
    const clockEl = document.getElementById('clock');
    setInterval(()=>{
      const d=new Date();clockEl.textContent=d.toLocaleTimeString();
    },1000);

    // ============ SIMPLE AUDIO DEMO =========
    const tracks=[
      {title:"Sample One",artist:"OTS",length:"03:21",src:"https://www.kozco.com/tech/piano2-CoolEdit.mp3"},
      {title:"Sample Two",artist:"OTS",length:"02:47",src:"https://www.kozco.com/tech/organfinale.wav"}
    ];

    const playlistBody=document.getElementById('playlistBody');
    tracks.forEach((t,i)=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${i+1}</td><td>${t.title}</td><td>${t.artist}</td><td>${t.length}</td>`;
      tr.addEventListener('dblclick',()=>{
        // load into deck A by default
        loadTrack('A',t);
      });
      playlistBody.appendChild(tr);
    });

    function loadTrack(deck,trackObj){
      const audio=document.getElementById('audio'+deck);
      const info=document.getElementById(deck.toLowerCase()+'Track');
      if(!trackObj){ // if not passed, use first track
        trackObj=tracks[0];
      }
      audio.src=trackObj.src;
      info.textContent=trackObj.title+' - '+trackObj.artist;
    }

    function playPause(deck){
      const audio=document.getElementById('audio'+deck);
      if(audio.paused){audio.play();}else{audio.pause();}
    }

    // ========== CROSS FADER (very crude) ========
    const xfader=document.getElementById('xfader');
    const audioA=document.getElementById('audioA');
    const audioB=document.getElementById('audioB');
    xfader.addEventListener('input',()=>{
      const val=parseInt(xfader.value,10)/100; // 0–1
      audioA.volume=1-val;
      audioB.volume=val;
    });