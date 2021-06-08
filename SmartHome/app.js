const express = require('express');
const path = require('path');
const fetch=require('node-fetch');
const { setTimeout } = require('timers');
const AbortController = require('node-abort-controller');

var app = express();

// устрйоства
let devices = []; 
//Для полученя даты-время последнего обновления устройств
let lastupdate=[];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

//отправляет список устройств на клиентскую часть (сайт)
app.get('/devices', async (req, res) =>{
    if(req.query.lastupdate== null || req.query.lastupdate== 0){
        res.send(devices);
        return;
    }
    let t, i;
    i = setInterval(() => {
        if(lastupdate.some(l => l > req.query.lastupdate)){
            clearTimeout(t);
            clearInterval(i);
            let devChan=[];
            lastupdate.forEach((lup,index)=> {
                if(lup > req.query.lastupdate)
                    devChan.push(devices[index]);
            })
            res.send(devChan);
        }
    }, 100);
    t = setTimeout(() => {
        clearTimeout(t);
        clearInterval(i);
        res.status(304);
        res.end();
    }, 60000);
});

//запрос клиентской части на изменения состояния устройств
app.post('/devices', (req,res) => {
    let dev=devices.find(d => d.idDevice==req.body.idDevice);
    if (dev==null){
        res.sendStatus(400);
        return;
    }
    fetch('http://127.0.0.1:3000/device', {
        method: 'POST',
        body: JSON.stringify({id: req.body.idDevice, status: req.body.statusData})
    })
    .then(result => {
        //dev.statusData=req.body.statusData;
        res.sendStatus(200);
    });
})

Device_Scan();
//прослушивание
app.listen(80);
//Сервер подкличлся
console.log(`Running server at http://127.0.0.1`);

//запрашивание списка устройств из backend
async function Device_Scan()
{ 
    let resultConnection;
    while(true)
    {
        let r=true;
        resultConnection=await fetch('http://127.0.0.1:3000/device');
        if(resultConnection.ok)
            break;
        let t= setTimeout(() => r = false, 10000);
        while(r);
        clearTimeout(t);
    }
    devices = await resultConnection.json();
    for (let i=0; i< devices.length;i++)
    lastupdate.push(new Date());
    Device_Status();
}

//отслеживание изменения устройств (тот самый long pull с макетом)
async function Device_Status()
{
    while(true){
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 61000);
        let deviceChange = await fetch('http://127.0.0.1:3000/device_change', {
            signal: controller.signal
        })
        clearTimeout(timeout);
        if (deviceChange.status==200){
            let newStatusDevice = await deviceChange.json();
            let newDevice = devices.findIndex(d => d.idDevice == newStatusDevice.idDevice);
            if (newDevice != -1){
                for (let i= 0; i < newStatusDevice.statusData.length; i++)
                    devices[newDevice].statusData[i] = newStatusDevice.statusData[i];
                lastupdate[newDevice] = new Date();
            }
            else {
                devices.push(newStatusDevice);
                lastupdate.push(new Date().getTime());
            }
        }
    }
}
