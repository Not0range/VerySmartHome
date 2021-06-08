let lastupdate=0;

$(document).ready(()=>{
    dataDevice();
});         

async function dataDevice() 
{
    //заполнение устройств на страничке, если у устройств изменилось состояние он их изменяет
    while(true)
    {
        await $.ajax(`/devices?lastupdate=${lastupdate}`, {timeout: 61000})
        .then((result_devices, state, status)=> {
            if(status.status == 200){
                for ( let device of result_devices){
                    let dataIdDevice=$(`div[data-id="${device.idDevice}"]`);
                    if(dataIdDevice.length != 0)
                        changeStateColorSensors(device);
                    else 
                        addDevice(device);
                }
                lastupdate = new Date().getTime();
            }
        });
    }
}
function addDevice(device)
{
    let categoriesDevice=$(`div[data-categories="${device.category}"]`);
    
    if (categoriesDevice.length == 0 && device.deviceType!=2 ){
        $("#Device").append(`<div class="CategoriesDevice" data-categories="${device.category}">
        <h3>${device.category} </h3> </div>`);
        categoriesDevice=$(`div[data-categories="${device.category}"]`);
    }
    switch(device.deviceType){
    case 0:
        $(categoriesDevice).append(`<div data-id="${device.idDevice}"
        data-value="${device.statusData[0] ? 1 : 0}"
        onclick="toggle_device(this)"
        style="background-color: ${device.statusData[0]? 'yellow':'gray'};
        color: ${device.statusData[0]? 'black':'white'}">
        <div><i class='bx bx-certification bx-rotate-90' ></i><p> ${device.nameDevice}</p></div></div>`
        );
        break;
    case 1:
        $(categoriesDevice).append(`<div data-id="${device.idDevice}"
        data-value="${device.statusData[0] ? 1 : 0}"
        onclick="toggle_device(this)"
        style="background-color: ${device.statusData[0]? 'yellow':'gray'};
        color: ${device.statusData[0]? 'black':'white'}">
        <div><i class='bx bx-certification bx-rotate-90' ></i><p> ${device.nameDevice} </p></div>
        <input onclick="event.stopPropagation()" onchange="changeStatusTelev(this, 1, 50)" type="number" 
        min ="1" max ="50" step="1" 
        value="${device.statusData[1]}"></div>`
        );
        break;
    case 2:
        $("#Main").append(`<div class="sensorsBlok">
        <div> <h3 class="SesorsHiggers" onclick="SlideToggleSensors(this, '${device.idDevice}')"> 
        ${device.category} ▼</h3> </div>
        <div data-id="${device.idDevice}" data-categories="${device.category}" style="display:flex; 
        flex-wrap:wrap"><div class="buttonGlavnia" style="background-color:
        ${color_sensors(40,0,device.statusData[0])}">
        Температура: ${device.statusData[0]}
        </div>
        <div class="buttonGlavnia" style="background-color:${color_sensors_vl(100,0,device.statusData[1])}">
        Влажность: ${device.statusData[1]}
        </div>
        <div class="buttonGlavnia" style="background-color:${color_sensors(2,-2,device.statusData[2])}">
        Загазованность: ${device.statusData[2]}
        </div>
        </div>
        </div>`);
        break;
    case 3:
        $(categoriesDevice).append(`<div data-id="${device.idDevice}"
        data-value="${device.statusData[0] ? 1 : 0}"
        onclick="toggle_device(this)"
        style="background-color: ${device.statusData[0]? 'yellow':'gray'};
        color: ${device.statusData[0]? 'black':'white'}">
        <i class='bx bx-certification bx-rotate-90' ></i><p> ${device.nameDevice}</p> 
        <input type="number" min ="0" max ="30" step="1" value="0"></div>`
        );
        break;
    case 4:
        $(categoriesDevice).append(`<div data-id="${device.idDevice}"
        data-value="${device.statusData[0] ? 1 : 0}"
        onclick="toggle_device(this)"
        style="background-color: ${device.statusData[0]? 'yellow':'gray'};
        color: ${device.statusData[0]? 'black':'white'}"><div>
        <i class='bx bx-certification bx-rotate-90' ></i><p> ${device.nameDevice}</p></div>
        <input onclick="event.stopPropagation()" onchange="changeStatusTelev(this, 1, 3)" type="number" 
        min ="1" max ="3" step="1" value="${device.statusData[1]}"></div>`
        );
        break; 
    } 

}

function SlideToggleSensors(e, id){
    if(e.innerHTML[e.innerHTML.length - 1] == "▼")
        e.innerHTML = e.innerHTML.slice(0, e.innerHTML.length - 1) + "▲";
    else
        e.innerHTML = e.innerHTML.slice(0, e.innerHTML.length - 1) + "▼";
    $(`div[data-id="${id}"]`).slideToggle();
}

function changeStateColorSensors(device)
{
    if(device.deviceType == 2){
        let s = $(`#Main div[data-id="${device.idDevice}"] div`);
        s[0].innerText = `Температура: ${device.statusData[0]}`;
        s[0].style['background-color'] = color_sensors(40,0,device.statusData[0]);
        s[1].innerText = `Влажность: ${device.statusData[1]}`;
        s[1].style['background-color'] = color_sensors_vl(100,0,device.statusData[1]);
        s[2].innerText = `Загазованность: ${device.statusData[2]}`;
        s[2].style['background-color'] = color_sensors(2,-2,device.statusData[2]);
        return;   
    }
    let dataIdDevice=$(`div[data-id="${device.idDevice}"]`);
    dataIdDevice.attr('data-value', device.statusData[0] ? 1 : 0);
    dataIdDevice.css('background-color', device.statusData[0] ? 'yellow' : 'gray');
    dataIdDevice.css('color', device.statusData[0] ? 'black' : 'white');
    if(device.deviceType==1||device.deviceType==3||device.deviceType==5)
        dataIdDevice[0].querySelector('input').value=+device.statusData[1];
}

function color_sensors(max,min,value)
{
    let sr=(max+min)/2;
    if(value>max)
        value=max;
    else if( value<min)
        value=min;
    let red=0;
    let green=255;
    let blue=0;

    let value_color=Math.round(Math.abs(value-sr)*(255/(max-sr)));
    green-=value_color*5;
    if(green<0)
        green=0;
    if(value>sr)
        red=value_color;
    else
        blue=value_color;
    
    let r = (red.toString(16).length == 1 ? '0' : '')+red.toString(16);
    let g = (green.toString(16).length == 1 ? '0' : '')+green.toString(16);
    let b = (blue.toString(16).length == 1 ? '0' : '')+blue.toString(16);
    return r + g + b;
}
function color_sensors_vl(max,min,value)
{
    let sr=(max+min)/2;
    if(value>max)
        value=max;
    else if(value<min)
        value=min;
    let blue=128;

    let value_color=Math.round(Math.abs(value-sr)*(127/(max-sr)));
    if(value>sr)
        blue+=value_color;
    else
        blue-=value_color;
        
    let b = (blue.toString(16).length == 1 ? '0' : '')+blue.toString(16);
    return '0000' + b;
}

function toggle_device(e){
    $.post('/devices',{ idDevice: e.dataset.id, statusData: [!+e.dataset.value] });
}

//изменение значений кондиционер, отопление, кондиционер
function changeStatusTelev(e, min, max){
    if(e.value < min || e.value > max)
        return;
    $.post('/devices',{ idDevice: e.parentElement.dataset.id, statusData: [true,+e.value] });
}