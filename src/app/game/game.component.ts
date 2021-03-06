import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../services/socket.service';
import { GameService } from '../services/game.service';
import { GameInfo } from '../interfaces/gameInfo.interface';
import { HostStoreService } from '../services/host.store.service';
import { DisplaynamestoreService } from '../services/displaynamestore.service';
import { interval, Subscription } from 'rxjs';
import { Player } from '../interfaces/player.interface';
import { FormControl, Validators } from '@angular/forms';


@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit, OnDestroy{
  gameInfo: GameInfo
  displayName: string = '';
  savedName: boolean = false;
  currentGame: string;
  isHost: boolean
  currentPlayer;
  isArtist: boolean = false;
  timer: number = 60;
  subRef: Subscription;
  winner: Player;
  displayNameControl= new FormControl('', [
    Validators.required
  ]);

  constructor(private socket: SocketService, private gameService: GameService, 
    private actr: ActivatedRoute, private hostStore: HostStoreService, private displayNameStore: DisplaynamestoreService) { }

  savePlayer(){
    if(this.displayName === 'System'){
      this.displayNameControl.setErrors({system: true})
      return;
    }
    
    this.savedName = true
    this.gameService.joinGame(this.displayName, this.currentGame)
  }

  leaveGame(){
    this.gameService.leaveGame(this.displayName, this.currentGame)
  }
  closeRoom(){
    this.gameService.closeRoom(this.currentGame)
  }
  newTopic(e){
    this.gameService.newTopic();
    if(this.timer == 60){
      this.timer = 59;
    this.startCountdown()
    }
  }

  ngOnInit(): void {
    this.socket.startTimer$.subscribe(val =>{
      let sub = interval(1000)
      if(val == true){
        
        this.subRef = sub.subscribe(v=>{
          this.timer = 59-v;
          
          if(this.timer == 0){
            
            this.subRef.unsubscribe();
            this.timer = 60
            if(this.isHost){
              this.socket.newRound();
            }
          }
        })
      }
          else if(this.subRef && !val){
            this.subRef.unsubscribe()
            this.timer = 60;
          }
    })

    this.displayNameStore.player$.subscribe(val=> this.currentPlayer = val)
    
    this.currentGame = this.actr.snapshot.params.gameId;
    this.gameService.gameInfo(this.currentGame).subscribe((val: any) => {
      if(val && this.currentPlayer == val.currentArtist.displayName){
        this.isArtist = true;
      } else{
        this.isArtist = false;
      }
      if(val){
       this.gameInfo = {
        gameId: val.gameId,
        artist: val.currentArtist,
        currentTopic: val.currentTopic,
        users: val.users,
        gameConfig: {
          maxRounds: val.gameConfig.maxRounds,
          maxScore: val.gameConfig.maxScore,
          currentRound: val.gameConfig.currentRound
        }
      }
    }
    })
    this.hostStore.$hostStatus.subscribe(val =>
      {this.isHost = val});
    if(this.isHost === true){
      this.savedName = true
    } 
    this.socket.winner$.subscribe(val => {
      this.winner = val;
      }) 
  }


  ngOnDestroy(): void{
    this.socket.leaveGame(this.displayName, this.currentGame);
  }

  startCountdown() {
    this.socket.startTimer(true);

    
  }

}
