using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json;

namespace WinFormsApp1
{
    public partial class Form1 : Form
    {
        const string hostname = "127.0.0.1";
        const int port = 3000;
        const int timeout = 20000;
        List<HttpListenerResponse> deviceChange= new List<HttpListenerResponse>();

        HttpListener http;

        public Form1()
        {
            InitializeComponent();

            http = new HttpListener();
            http.Prefixes.Add($"http://{hostname}:{port}/");
            http.Start();
            HTTPList();

            List<Device> devices = new List<Device>();
            devices.Add(new Device("Light1", "Свет кухня", Device.DeviceType.Light, "Кухня"));
            devices[devices.Count - 1].Changed += d => Invoke(new Action(() => checkBox1.Checked = (bool)d.statusData[0]));
            devices.Add(new Device("Light3", "Свет гостинная", Device.DeviceType.Light, "Гостинная"));
            devices[devices.Count - 1].Changed += d => Invoke(new Action(() => checkBox4.Checked = (bool)d.statusData[0]));
            devices.Add(new Device("Light2", "Свет детская", Device.DeviceType.Light, "Детская"));
            devices[devices.Count - 1].Changed += d => Invoke(new Action(() => checkBox2.Checked = (bool)d.statusData[0]));
            devices.Add(new Device("Television1", "Телевизор гостинная", Device.DeviceType.Television, "Гостинная"));
            devices[devices.Count - 1].Changed += d => Invoke(new Action(() => {
                checkBox3.Checked = (bool)d.statusData[0];
                numericUpDown4.Value = int.Parse(d.statusData[1].ToString());
            }));
            devices.Add(new Device("HeatKitchen", "Вытяжка кухня", Device.DeviceType.Hood, "Кухня"));
            devices[devices.Count - 1].Changed += d => Invoke(new Action(() => {
                checkBox5.Checked = (bool)d.statusData[0];
                numericUpDown5.Value = int.Parse(d.statusData[1].ToString());
            }));
            devices.Add(new Device("Датчики1", "Датчики кухня", Device.DeviceType.Sensors, "Кухня"));
            devices[devices.Count - 1].Changed += d => Invoke(new Action(() => {
                numericUpDown1.Value = decimal.Parse(d.statusData[0].ToString());
                numericUpDown2.Value = decimal.Parse(d.statusData[1].ToString());
                numericUpDown3.Value = decimal.Parse(d.statusData[2].ToString());
            }));

            //Клиенты просят ответы на изменения устройств и всем рассылается ответ (кто подписался на событие ответ сервер отправляет)
            foreach (var dev in devices)
            {
                dev.Changed += d =>
                {
                    foreach (var dev in deviceChange)
                    {
                        try
                        {
                            dev.StatusCode = 200;
                            using (StreamWriter write = new StreamWriter(dev.OutputStream))
                            {
                                write.Write(JsonConvert.SerializeObject(d));
                                write.Close();
                                dev.Close();
                            }
                        }
                        catch (Exception) { };

                    }
                    deviceChange.Clear();
                };
            }

            Device.devices = devices.ToDictionary<Device, string>( device => device.idDevice);

            checkBox1.CheckedChanged += (s, ea) => 
            { 
                Device.devices["Light1"].SetStatus(checkBox1.Checked);
            };

            checkBox2.CheckedChanged += (s, ea) =>
            {
                Device.devices["Light2"].SetStatus(checkBox2.Checked);
            };

            checkBox3.CheckedChanged += (s, ea) =>
            {
                Device.devices["Television1"].SetStatus(checkBox3.Checked);
            };

            checkBox4.CheckedChanged += (s, ea) =>
            {
                Device.devices["Light3"].SetStatus(checkBox4.Checked);
            };

            numericUpDown4.ValueChanged += (s, ea) =>
            {
                var d = Device.devices["Television1"];
                d.SetStatus(d[0], (int)numericUpDown4.Value);
            };

            numericUpDown5.ValueChanged += (s, ea) =>
            {
                var d = Device.devices["HeatKitchen"];
                d.SetStatus(d[0], (int)numericUpDown5.Value);
            };

            numericUpDown1.ValueChanged += (s, ea) =>
            {
                Device.devices["Датчики1"].SetStatus(numericUpDown1.Value);
            };

            numericUpDown2.ValueChanged += (s, ea) =>
            {
                var d = Device.devices["Датчики1"];
                d.SetStatus(d[0], numericUpDown2.Value);
            };
            numericUpDown3.ValueChanged += (s, ea) =>
            {
                var d = Device.devices["Датчики1"];
                d.SetStatus(d[0], d[1], numericUpDown3.Value);
            };

        }

        async Task HTTPList()
        {
            while (true)
            {
                var context = await http.GetContextAsync();
                switch (context.Request.RawUrl)
                {
                    case "/device":
                        if (context.Request.HttpMethod == "GET")
                        {
                            context.Response.StatusCode = 200;
                            context.Response.ContentType = "application/json";
                            context.Response.AddHeader("Charset", "UTF-8");
                            StreamWriter write = new StreamWriter(context.Response.OutputStream);
                            await write.WriteAsync(JsonConvert.SerializeObject(Device.devices.Values.ToArray()));
                            write.Close();
                            context.Response.Close();
                        }
                        else if (context.Request.HttpMethod == "POST")
                        {
                            try
                            {
                                StreamReader reader = new StreamReader(context.Request.InputStream);
                                var device = JsonConvert.DeserializeObject<IdStatusDevice>(await reader.ReadToEndAsync());
                                reader.Close();
                                if (string.IsNullOrWhiteSpace(device.id) || device.status == null || device.status.Length == 0)
                                {
                                    context.Response.StatusCode = 400;
                                    context.Response.Close();
                                    break;
                                }
                                if (!Device.devices.TryGetValue(device.id, out var currentDevice))
                                {
                                    context.Response.StatusCode = 400;
                                    context.Response.Close();
                                    break;
                                }
                                if (currentDevice.statusData.Length > 1 && device.status.Length > 1)
                                    currentDevice.SetStatus(bool.Parse(device.status[0].ToString()), int.Parse(device.status[1].ToString()));
                                else
                                    currentDevice.SetStatus(bool.Parse(device.status[0].ToString()));
                                context.Response.StatusCode = 200;
                                context.Response.Close();
                            }
                            catch (InvalidCastException)
                            {
                                context.Response.StatusCode = 400;
                                context.Response.Close();
                                break;
                            }
                            catch (FormatException)
                            {
                                context.Response.StatusCode = 400;
                                context.Response.Close();
                                break;
                            }
                        }
                        break;
#pragma warning disable CS4014
                    case "/device_change":
                        if (context.Request.HttpMethod == "GET")
                        {
                            context.Response.AddHeader("Charset", "UTF-8");
                            HttpListenerResponse res = context.Response;
                            deviceChange.Add(res);
                            Task.Run(() =>//Задача: дать овтет если не было изменений на устройствах
                            {
                                CancellationTokenSource cancel = new CancellationTokenSource();
                                Task task = new Task(() => //Подзадача отслеживает изменения: если deviceChange(список ответов на изменные устроства) пустой то изменение произошло,
                                                           //если ожсдается timeout отправляется код 304 и задача удаляется из списка deviceChange
                                {
                                    while (deviceChange.Count != 0) ;
                                });
                                task.Start();
                                task.Wait(timeout);
                                if (task.Status != TaskStatus.RanToCompletion)
                                {
                                    cancel.Cancel();
                                    res.StatusCode = 304;
                                    deviceChange.Remove(res);
                                    try
                                    {
                                        res.Close();
                                    }
                                    catch (HttpListenerException){ }
                                }
                            });
                        }
                        break;
#pragma warning restore CS4014
                }
            }
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            numericUpDown1.Value = 25.00M;
            numericUpDown2.Value = 35.10M;
            numericUpDown3.Value = 0.20M;
            
        }

    }

}
class Device
{
    public static Dictionary<string, Device> devices = new Dictionary<string, Device>();
    
    public string idDevice;

    public string nameDevice;

    public DeviceType deviceType;

    public object[] statusData;
    
    public string category;


    public Device(string id, string name, DeviceType deviceType, string category)
    {
        idDevice = id;
        nameDevice = name;
        this.deviceType = deviceType;
        this.category = category;

        switch (deviceType)
        {
            case DeviceType.Light:
            case DeviceType.Teapot:
                statusData = new object[1];
                statusData[0]=false;
                break;
            case DeviceType.Television:
            case DeviceType.Condition:
            case DeviceType.Heating:
            case DeviceType.Hood:
                statusData = new object[2];
                statusData[0] = false;
                statusData[1] = 0;
                break;
            case DeviceType.Sensors:
                statusData = new object[3];
                statusData[0] = 0m;
                statusData[1] = 0m;
                statusData[2] = 0m;
                break;
        }
    }
    //Делегат на изменения состояния устройств
    public event Action<Device> Changed;
    public object this [int i]
    {
        get
        {
            return statusData[i];
        }
        //set 
        //{
        //    if (statusData[i].ToString() == value.ToString())
        //        return;
        //    statusData[i] = value;
        //    Changed?.Invoke(this);
        //}
    }

    public void SetStatus(params object[] args)
    {
        for (int i = 0; i < statusData.Length && i < args.Length; i++)
            statusData[i] = args[i]; ;
        Changed?.Invoke(this);
    }
    public enum DeviceType 
    {
        Light = 0,
        Teapot = 6,
        Curtains=0,//Шторы
        Door=0,
        Television = 1,
        Sensors=2,
        Heating=3,//Отопление
        Hood=4,//Вытяжка
        Condition=5
    }
}

class IdStatusDevice
{
    public string id = null;
    public object[] status = null;
}