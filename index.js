const express = require('express');
const mysql = require('mysql2');
const port = 7500;
// Variables of the project
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Dinossauro03",
    database: "timeline_tyrants_db" // Schema name 
});

// Connect to database and check if it's working. Otherwise we cry with the server.
connection.connect((err) => {
    if (err){
        console.log("Error connection to DB: " + err);
        return;
    }
    console.log("Connected to database!");
})

const app = express();

app.use(express.urlencoded({extended:false}));
app.use(express.static("www"));

app.listen(port, () =>{
    console.log("Server is running on localhost " + port);
});

// Funcs
function CheckAtkWin(){
    let attackersWin = false;

 
    const query = `
        SELECT TileBoardID FROM TileBoard INNER JOIN Cards on TileBoard.CardID = Cards.CardID Where CardRoleID = 2 And LocationID IN (1, 7, 13, 20)
    `;

    connection.query(query, (error, results) => {
        if (error) {
            console.error('Error executing MySQL query:', error);
            res.status(500).send('Internal Server Error');
            return;
        }

  
        if (results.length > 0){
            attackersWin = true
        }

        if (attackersWin) {
            res.send('Attackers win!');

        } else {
            res.send('Attackers do not win.');
        }
    });
}
function CheckTurn(response,Action,VarTable){
    var RoleID
    var GameStatus
    var Match = VarTable[0]
    var PlayerID = VarTable[1]
    connection.execute('SELECT RolesID FROM timeline_tyrants_db.playermatch WHERE MatchID = ? AND UserID = ?',
    [Match,PlayerID],
    function (err, results, fields) {
        if (results.length > 0){
            RoleID = results[0].RolesID;
            connection.execute('SELECT Match_GameStateID FROM timeline_tyrants_db.match WHERE MatchID = ?',
            [Match],
            function (err, results, fields) {
                if (results.length > 0){
                    GameStatus = results[0].Match_GameStateID;
                    if (GameStatus == 2 && RoleID == 1 || GameStatus == 3 && RoleID == 2 ){
                        VarTable["GameST"] = GameStatus
                        Action(Match,response,VarTable)
                        return
                    }else{
                        response.send("You can't perform an action when it's not your turn, PlayerID:"+PlayerID+" MatchID:"+Match+" RoleID: "+RoleID+" GameStatusID: "+GameStatus);
                    }
                }else{
                    response.send("No Match: '"+Match+"' Exists");
                };
            });
        }else{
            response.send("No Match: '"+Match+"' Exists");
        };
    });
}
function SelectCard(match,response,VarTable){
    var MatchID = VarTable[0]
    var PlayerID = VarTable[1]
    var PosX = VarTable[2]
    var PosY = VarTable[3]
    var LocID
    connection.execute('SELECT LocationID FROM timeline_tyrants_db.location WHERE PosX = ? AND PosY = ?',
    [PosX,PosY],
    function (err, results, fields) {
        if (err){
            response.send(err)
            return
        }else if (results.length > 0){
            LocID = results[0].LocationID
            connection.execute('SELECT TileBoardID FROM timeline_tyrants_db.tileboard WHERE LocationID = ? and MatchID = ? and UserID = ? and CurrentHealth > 0',
            [LocID,MatchID,PlayerID],
            function (err, results, fields) {
                if (err){
                    response.send(err)
                    return
                }else if (results.length > 0){
                    VarTable["Unit"] = results[0].TileBoardID
                    VarTable["LocationID"] = LocID
                    console.log("Bye bye")
                    ResourceActionTax(match,response,VarTable)
                }else{
                    response.send("No Found Unit")
                    return
                }
            })
        }else{
            response.send("No Location Here :("+ VarTable)
            return
        }
    });
}
function ResourceActionTax(Match,response,VarTable){
    var func = VarTable["Action"]
    var NumOfActions = VarTable["NumOfActions"]
    var CurrentResources
    var ActionCost = 0
    connection.execute('SELECT cards.ActionCost FROM TileBoard INNER JOIN Cards on TileBoard.CardID = Cards.CardID Where TileBoardID = ?',
    [VarTable["Unit"]],
    function (err, results, fields) {
        if (err){
            response.send(err)
            return
        }else if(results.length > 0){
            ActionCost = results[0].ActionCost
            connection.execute('SELECT Resources FROM timeline_tyrants_db.playermatch WHERE MatchID = ? and UserID = ?',
                    [Match,VarTable[1]],
                        function (err, results, fields) {
                        if (err){
                            response.send(err)
                            return
                        
                        }else if(results.length > 0){
                            CurrentResources = results[0].Resources
                        if (CurrentResources-(ActionCost*NumOfActions) >= 0){
                            connection.execute('UPDATE timeline_tyrants_db.playermatch SET Resources = ? Where MatchID = ? and UserID = ?',
                            [CurrentResources-(ActionCost*NumOfActions),VarTable[0],VarTable[1]],
                            function(err,results,fields){
                                if (err){
                                    response.send(err);
                                    return
                                }else if(results){
                                    func(Match,response,VarTable)
                                }else{
                                    response.send(results);
                                    return
                                }
                            })
                        }else{
                            response.send("You don't have enough resources to perform this action:"+ActionCost*NumOfActions)
                            return
                        }
                        }else{
                            response.send("Couldn't Find Resources of Player: "+VarTable[1]+" from Match:"+VarTable[2])
                            return
                        }
            })
        }else{
            response.send("Action Cost Couldn't be found")
            return
        }
    })
}
function ResetResource(response,Turn,VarTable){
    console.log(Turn)
    connection.execute('UPDATE timeline_tyrants_db.playermatch SET Resources = ? Where MatchID = ?',
    [Turn,VarTable[0]],
    function(err,results,fields){
        if (err){
            response.send(err);
            return
        }else{
            response.send("Turn Done Resources set to new turn number: "+Turn)
            return
        }
    })
}
function PlaceCard(response,MatchID,PlayerID,CardID,Location){
    var MaxHealth = 0
    connection.execute('SELECT Health FROM timeline_tyrants_db.cards WHERE CardID = ?',
    [CardID],
        function (err, results, fields) {
            if (err){
                response.send(err);
            return
            }else{
                MaxHealth = results[0].Health
                connection.execute('INSERT INTO tileboard (CurrentHealth, CardID, LocationID, MatchID, UserID) VALUES (?,?,?,?,?)',
                [MaxHealth, CardID, Location, MatchID, PlayerID],
                function (err, results, fields) {
                if (err){
                    response.send(err);
                    return
                }else{
                    response.send("Placed Card")
                    return
                }
            });    
            }
});
}
function BuyCard(response,MatchID,PlayerID,CardID,Location){
    var UnitCost = 0
    var CurrentResources = 0
    connection.execute('SELECT SpawnCost FROM Cards Where CardID = ?',
    [CardID],
    function (err, results, fields) {
        if (err){
            response.send(err)
            return
        }else if(results.length > 0){
            UnitCost = results[0].SpawnCost
            connection.execute('SELECT Resources FROM timeline_tyrants_db.playermatch WHERE MatchID = ? and UserID = ?',
                    [MatchID,PlayerID],
                        function (err, results, fields) {
                        if (err){
                            response.send(err)
                            return
                        
                        }else if(results.length > 0){
                            CurrentResources = results[0].Resources
                        if ((CurrentResources-UnitCost) >= 0){
                            connection.execute('UPDATE timeline_tyrants_db.playermatch SET Resources = ? Where MatchID = ? and UserID = ?',
                            [CurrentResources-UnitCost,MatchID,PlayerID],
                            function(err,results,fields){
                                if (err){
                                    response.send(err);
                                    return
                                }else if(results){
                                    PlaceCard(response,MatchID,PlayerID,CardID,Location)
                                }else{
                                    response.send(results);
                                    return
                                }
                            })
                        }else{
                            response.send("You don't have enough resources to buy this Unit: "+UnitCost)
                            return
                        }
                        }else{
                            response.send("Couldn't Find Resources of Player: "+VarTable[1]+" from Match:"+VarTable[2])
                            return
                        }
            })
        }else{
            response.send("Action Cost Couldn't be found")
            return
        }
    })
}
function SwitchGameState(response,Turn,Match)
{
    console.log(Turn)
    connection.execute('SELECT Match_GameStateID FROM timeline_tyrants_db.match WHERE MatchID = ?',
    [Match],
    function (err, results, fields) {
        var GameState = 0
        if (results.length > 0){
            if (results[0].Match_GameStateID == 2){
                GameState = 3
            }else if(results[0].Match_GameStateID == 3){
                GameState = 2
            }else{
            response.send("Error")
            }
            connection.execute('UPDATE timeline_tyrants_db.match SET Match_GameStateID = ? Where MatchID = ?',
            [GameState,Match],
            function (err, results, fields) {
                if (err){
                    response.send(err);
                    return
                }else{
                    console.log(GameState)
                    if (GameState == 3){
                        console.log(Turn)
                        ResetResource(response,Turn,Match)
                    }else{
                        response.send("Turn End I guess :3")
                        return
                    }

                }
            });
        }else{
            res.send("No Match: '"+Match+"' Exists");
            return
        }
    });
}
function EndTurn(Match,response,VarTable){
    var Turn = 0
    var GameState = VarTable["GameST"]
    if (GameState == 3){
        connection.execute('SELECT Turn FROM timeline_tyrants_db.match WHERE MatchID = ?',
        [Match],
        function (err, results, fields) {
            if (results.length > 0){
            Turn = results[0].Turn + 1
            connection.execute('UPDATE timeline_tyrants_db.match SET Turn = ? Where MatchID = ?',
            [Turn,Match],
            function (err, results, fields) {
                if (err){
                    response.send(err);
                    return
                }else{
                    console.log("it's Turn: "+Turn)
                    SwitchGameState(response,Turn,Match)
                }
            });
            }else{
                res.send("No Match: '"+Match+"' Exists");
                return
            }
        });
    }else{
        connection.execute('SELECT Turn FROM timeline_tyrants_db.match WHERE MatchID = ?',
        [Match],
        function (err, results, fields) {
            if (results.length > 0){
            Turn = results[0].Turn
            SwitchGameState(response,Turn,Match)
            }else{
            res.send("No Match: '"+Match+"' Exists");
            }
        })
    }
}
function CardCheck(Match,response,VarTable){
    var GameStatus 
    var Location
    var MatchID = VarTable[0]
    var PlayerID = VarTable[1]
    var PosX = VarTable[2]
    var PosY = VarTable[3]
    var CardID = VarTable[4]
    connection.execute('SELECT Match_GameStateID FROM timeline_tyrants_db.match WHERE MatchID = ?',
    [MatchID],
    function (err, results, fields) {
        if (results.length == 0){
            res.send("Opsi Dopsi");
            return
        }
        GameStatus = results[0].Match_GameStateID
        connection.execute('SELECT LocationID FROM timeline_tyrants_db.location WHERE PosX = ? and PosY = ?',
        [PosX, PosY],
        function (err, results, fields) {
        if (results.length == 0){
            res.send("Opsi Dopsi");
            return;
        }
        Location = results[0].LocationID
        connection.execute('SELECT TileBoardID FROM timeline_tyrants_db.tileboard WHERE LocationID = ? and MatchID = ?',
        [Location, MatchID],
        function (err, results, fields) {
        if (results.length == 0){
            if(GameStatus == 3 && PosX == 6){   
                BuyCard(response,MatchID,PlayerID,CardID,Location)
            }else if(GameStatus == 2 && PosX < 6){
                BuyCard(response,MatchID,PlayerID,CardID,Location)
            }else{
                    response.send("You can't play it here NERD" + GameStatus)
                    return
            }
            }else{
                response.send("There is already a card at that coordinates!")
                return
            }
        });
    });             
});
}
function MoveCard(Match,response,VarTable){
    VarTable[2] = VarTable[2] - VarTable[4]
    if (VarTable[4] < 0 ){
        response.send("You can't move backwards")
        return
    }
    if (VarTable["GameST"] == 2){
        response.send("Cheater! Defender can't move their units")
        return
    }
    connection.execute('SELECT LocationID FROM timeline_tyrants_db.location WHERE PosX = ? AND PosY = ?',
        [VarTable[2],VarTable[3]],
        function (err, results, fields) {
            if (err){
                response.send(err)
                return
            }else if (results.length > 0){
                LocID = results[0].LocationID
                connection.execute('SELECT * FROM timeline_tyrants_db.tileboard WHERE LocationID = ? and CurrentHealth > 0',
                [LocID],
                function (err, results, fields) {
                    if (err){
                        response.send(err);
                        return
                    }else if (results.length > 0){
                        response.send("Can't place a unit in top of each other.");
                        return
                    }else{
                        connection.execute('UPDATE timeline_tyrants_db.tileboard SET LocationID = ? WHERE TileBoardID = ?',
                        [LocID,VarTable["Unit"]],
                        function (err, results, fields) {
                            if (err){
                                response.send(err);
                                return
                            }else{
                                CheckAtkWin()
                            }
                        })
                    }
                });
            }else{
                response.send("You can't move here.")
                return
            } 
    });   
}

function Explosion(response,TargetLocID,VarTable){
    var ExplosionDamage = 0
    connection.execute('SELECT cards.Damage, cards.CardID FROM TileBoard INNER JOIN Cards on TileBoard.CardID = Cards.CardID Where TileBoardID = ?',
    [TargetLocID],
    function (err, results, fields) {
            if (err){
                response.send(err)
                return
            }else if (results.length > 0){
                ExplosionDamage = results[0].Damage 
                connection.execute('select TileBoardID from tileboard INNER JOIN location on tileboard.LocationID = location.LocationID where tileboard.UserID = ? and posY = ? and posX in (?+1,?-1) and CurrentHealth > 0',
                [VarTable[1],VarTable[5],VarTable[4],VarTable[4]],
                function (err, results, fields) {
                    if (results.length > 0){
                        var WhatHappened 
                        var TargetExplosiveTab = results
                        for (i=0;i<results.length;i++)
                        {
                            var TargetExplosiveID = TargetExplosiveTab[i].TileBoardID 
                            var TargetHealth
                            connection.execute('select CurrentHealth from tileboard INNER JOIN location on tileboard.LocationID = location.LocationID where TileBoardID = ?',
                            [TargetExplosiveID],
                            function (err, results2, fields) {
                                if (err){
                                    WhatHappened = err
                                    return
                                }else if(results2.length > 0){
                                    TargetHealth = results2 - ExplosionDamage 
                                    connection.execute('UPDATE timeline_tyrants_db.tileboard SET CurrentHealth = ? WHERE TileBoardID = ? and CurrentHealth > 0',
                                        [TargetHealth,TargetExplosiveID],
                                        function (err, results3, fields) {
                                            if (err){
                                                WhatHappened = err
                                                return WhatHappened
                                            }else if(results3.length > 0){
                                                WhatHappened = "Boomm!!!!"
                                                return WhatHappened
                                            }else{
                                                WhatHappened = "Boom?"
                                                return WhatHappened
                                            }
                                        });
                                }else{
                                    WhatHappened = "No Boom?"
                                    return WhatHappened
                                }
                            })
                        }
                        response.send(WhatHappened)
                        return
                    }else{
                        response.send("No Target in range| Explosive")
                        return
                    }
                })
            }
    })
}
function AttackTarget(response,TargetLocID,TargetHealth,VarTable){
    var Damage = 1
    connection.execute('SELECT cards.Damage, cards.CardID FROM TileBoard INNER JOIN Cards on TileBoard.CardID = Cards.CardID Where TileBoardID = ?',
    [VarTable["Unit"]],
    function (err, results, fields) {
            if (err){
                response.send(err)
                return
            }else if (results.length > 0){
                Damage = results[0].Damage
                TargetHealth = TargetHealth - Damage
                    connection.execute('UPDATE timeline_tyrants_db.tileboard SET CurrentHealth = ? WHERE TileBoardID = ? and CurrentHealth > 0',
                    [TargetHealth,TargetLocID],
                    function (err, results, fields) {
                    if (err){
                        response.send(err)
                        return
                    }else if(results){
                        if (TargetHealth <= 0){
                            connection.execute('SELECT cards.AttackTypeID FROM TileBoard INNER JOIN Cards on TileBoard.CardID = Cards.CardID Where tileboardID = ?',
                            [TargetLocID],
                            function (err, results, fields) {
                                if (results[0].AttackTypeID == 3){
                                    Explosion(response,TargetLocID,VarTable)
                                }else{
                                    response.send("You killed the unit :D")
                                    return
                                }
                            })
                        }
                    }else{
                        response.send("No Unit Damaged")
                        return
                    }
                });
            };
    });
}
function CheckTarget(Match,response,VarTable){
    var TargetPosX = VarTable[4]
    var TargetPosY = VarTable[5] 
    if (VarTable[2] > TargetPosX && VarTable["GameST"] == 2){
        response.send("You Can't Attack units Behind")
        return
    }else if (VarTable[2] < TargetPosX && VarTable["GameST"] == 3){
        response.send("You can't Attack units Behind")
        return
    }
    var TargetLocID 
    var AttackType
    connection.execute('SELECT LocationID FROM timeline_tyrants_db.location WHERE PosX = ? AND PosY = ?',
    [TargetPosX,TargetPosY],
    function (err, results, fields) {
        if (err){
            response.send(err)
            return
        }else if (results.length > 0){
            TargetLocID = results[0].LocationID
            TargetHealth = 0
            connection.execute('SELECT cards.AttackTypeID FROM TileBoard INNER JOIN Cards on TileBoard.CardID = Cards.CardID Where tileboardID = ?',
            [VarTable["Unit"]],
            function (err, results, fields) {
                if (results.length > 0){
                    AttackType = results[0].AttackTypeID
                    if (AttackType == 2){
                        if(VarTable["GameST"] == 2){
                            connection.execute('select TileBoardID, CurrentHealth from tileboard INNER JOIN location on tileboard.LocationID where tileboard.LocationID = location.LocationID and posY = ? and tileboard.UserID != ? and CurrentHealth > 0 order by PosX Desc',
                            [VarTable[3],VarTable[1]],
                            function (err, results, fields) {
                                if (results.length > 0){
                                    TargetLocID = results[0].TileBoardID
                                    TargetHealth = results[0].CurrentHealth
                                    AttackTarget(response,TargetLocID,TargetHealth,VarTable)
                                }else{
                                    response.send("No Target selected| Range Defender")
                                    return
                                }
                            })
                        }else{
                            connection.execute('select TileBoardID, CurrentHealth from tileboard INNER JOIN location on tileboard.LocationID where tileboard.LocationID = location.LocationID and posY = ? and tileboard.UserID != ? and CurrentHealth > 0 order by PosX',
                            [VarTable[3],VarTable[1]],
                            function (err, results, fields) {
                                if (results.length > 0){
                                    TargetLocID = results[0].TileBoardID
                                    TargetHealth = results[0].CurrentHealth
                                    AttackTarget(response,TargetLocID,TargetHealth,VarTable)
                                }else{
                                    response.send("No Target selected| Range Attacker")
                                    return
                                }
                            })
                        }
                    }
                    if (AttackType == 1){
                        if(VarTable["GameST"] == 2){
                            connection.execute('select TileBoardID, CurrentHealth from tileboard INNER JOIN location on tileboard.LocationID where tileboard.LocationID = location.LocationID and posY = ? and posX = ?+1 and tileboard.UserID != ? and CurrentHealth > 0',
                            [VarTable[3],VarTable[2],VarTable[1]],
                            function (err, results, fields) {
                                if (results.length > 0){
                                    TargetLocID = results[0].TileBoardID
                                    TargetHealth = results[0].CurrentHealth
                                    AttackTarget(response,TargetLocID,TargetHealth,VarTable)
                                }else{
                                    response.send("No Target in range| Melee Defender")
                                    return
                                }
                            })
                        }else{
                            connection.execute('select TileBoardID, CurrentHealth from tileboard INNER JOIN location on tileboard.LocationID where tileboard.LocationID = location.LocationID and posY = ? and posX = ?-1 and tileboard.UserID != ? and CurrentHealth > 0',
                            [VarTable[3],VarTable[2],VarTable[1]],
                            function (err, results, fields) {
                                if (results.length > 0){
                                    TargetLocID = results[0].TileBoardID
                                    TargetHealth = results[0].CurrentHealth
                                    AttackTarget(response,TargetLocID,TargetHealth,VarTable)
                                }else{
                                    response.send("No Target in range| Melee Attacker")
                                    return
                                }
                            })
                        }
                    }
                    else{
                        response.send("Idk: "+AttackType + " " + err)
                        return
                    }
                }else{
                    response.send("No AttackTypes Selected "+ AttackType + " " + err)
                    return 
                }
            })
        }else{
            response.send("No Location Here :("+ VarTable)
            return
        }
    });
}


//End Points
app.put('/MoveCard', (request, response) => {
    var PlayerID = request.body.player
    var Match = request.body.match
    var PosX = request.body.PosX
    var PosY = request.body.PosY
    var tilesmoved = request.body.moves
    var VarTable = [Match,PlayerID,PosX,PosY,tilesmoved]
    VarTable["Action"] = MoveCard
    VarTable["NumOfActions"] = tilesmoved
    var func = SelectCard
    CheckTurn(response,func,VarTable)
});
app.put('/AttackUnit', (request, response) => {
    var PlayerID = request.body.player
    var Match = request.body.match
    var PosX = request.body.PosX
    var PosY = request.body.PosY
    var TargetPosX = request.body.TargetPosX
    var TargetPosY = request.body.TargetPosY
    var VarTable = [Match,PlayerID,PosX,PosY,TargetPosX,TargetPosY]
    VarTable["Action"] = CheckTarget
    VarTable["NumOfActions"] = 1
    var func = SelectCard
    CheckTurn(response,func,VarTable)
});
app.post("/PlaceCard",(request,response)=>{
    var PosX = request.body.PosX
    var PosY = request.body.PosY
    var Match = request.body.match
    var PlayerID = request.body.player
    var CardID = request.body.cardid
    var VarTable
    VarTable = [Match,PlayerID,PosX,PosY,CardID]
    var func = CardCheck
    CheckTurn(response,func,VarTable)
});

app.put("/EndTurning",(request,response)=>{
    var PlayerID = request.body.player;
    var Match = request.body.match;
    var VarTable
    VarTable = [Match,PlayerID]
    var func = EndTurn
    CheckTurn(response,func,VarTable)
});

app.get("/GetTurn",(req,res)=>{
    var Match = req.body.Match;
    var PlayerID = req.body.PlayerID;
    var Role = 0;
    var CurrentResources = 0;
    console.log("Hello")
    connection.execute('SELECT * FROM timeline_tyrants_db.playermatch WHERE MatchID = ? And UserID = ?',
    [Match,PlayerID],
    function (err, results1, fields) {
        if (results1.length > 0){
            Role = results1[0].RoleID
            CurrentResources = results1[0].Resources
            connection.execute('SELECT * FROM timeline_tyrants_db.match WHERE MatchID = ?',
            [Match],
            function (err, results, fields) {
                if (results.length > 0){
                    res.send({
                        "authenticated": true,
                        "Turn": results[0].Turn,
                        "Role": Role,
                        "Resources": CurrentResources});
                    return
                }else{
                    res.send("No Match: '"+Match+"' Exists");
                    return
                }
            });
        }else{
            res.send("No Match: '"+Match+"' Exists, Error: "+err);
            return
        }
    });
});
