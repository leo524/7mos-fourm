function initMap(){
    createMap();//创建地图
    setMapEvent();//设置地图事件
    addMapControl();//向地图添加控件
 }



function createMap(){
	var map = new BMap.Map("map_canvas");          // 创建地图实例
	var point = new BMap.Point(116.404, 39.915);  // 创建点坐标  
	map.centerAndZoom("武汉",15);   
	var gc = new BMap.Geocoder();//地址解析类 
  
	//map.setCurrentCity("武汉"); // 仅当设置城市信息时，MapTypeControl的切换功能才能可用  
	 window.map = map;//将map变量存储在全局
	 window.point = point;//将point变量存储在全局
	 window.gc = gc;//将gc变量存储在全局
}

    
//地图事件设置函数：
function setMapEvent(){
  map.enableDragging();//启用地图拖拽事件，默认启用(可不写)
 // map.enableScrollWheelZoom();//启用地图滚轮放大缩小
  map.enableDoubleClickZoom();//启用鼠标双击放大，默认启用(可不写)
  map.enableKeyboard();//启用键盘上下左右键移动地图
 
 }

//地图控件添加函数：
function addMapControl(){

 map.addControl(new BMap.NavigationControl());    
 map.addControl(new BMap.ScaleControl());    
 map.addControl(new BMap.OverviewMapControl());    
 map.addControl(new BMap.MapTypeControl()); 
 }
//判断使用终端

function IsPC()
{
    var userAgentInfo = navigator.userAgent;
    var Agents = new Array("Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod");
    var flag = true;
    for (var v = 0; v < Agents.length; v++) {
        if (userAgentInfo.indexOf(Agents[v]) > 0) { flag = false; break; }
    }
    return flag;
}

function findPlace(){
document.getElementById("confirmPlace").value="";
var address=document.getElementById("inputMap3").value;

var local = new BMap.LocalSearch(map, {
  renderOptions:{map: map}
});
local.search(address);
var useFlag = IsPC();
//回调函数为每个maker 添加click事件，取得坐标
local.setMarkersSetCallback(function (pois) {
	for (var i = 0; i < pois.length; i++) {
	    
	    var lat = pois[i].point.lat;
	    var lng = pois[i].point.lng;
      if(useFlag==true){
          pois[i].marker.addEventListener("dblclick", function (e) {
              gc.getLocation(e.point, function(rs){
                  var title = e.target.K.title;
                  var addComp = rs.addressComponents;
                 var sContent = addComp.province + ", " + addComp.city + ", " +addComp.district+","+ addComp.street + ", " + addComp.streetNumber+","+title ;
                  document.getElementById("confirmPlace").value=sContent;
                  document.getElementById("flocation").value=sContent;
              });
              document.getElementById("lat").value=e.point.lat;
              document.getElementById("lng").value=e.point.lng;
              /*弹出框
               var infoWindow = new BMap.InfoWindow(sContent, { enableMessage: false });
               this.openInfoWindow(infoWindow);*/
              $.prompt.close();

          });

      }else{

          //var tmpfun = map.onclick;
          //map.onclick = null;
          /*alert("test1");*/
          pois[i].marker.addEventListener("click", function(e){
              alert("test1");
              var pt = e.point;
              gc.getLocation(pt, function(rs){
                  var addComp = rs.addressComponents;
                  alert(addComp.province + ", " + addComp.city + ", " + addComp.district + ", " + addComp.street + ", " + addComp.streetNumber);
              });
          });
        /* pois[i].marker.addEventListener("click", function (e) {

             var i=0;
             setTimeout(function(){
                 gc.getLocation(e.point, function(rs){
                    alert(e.point.lat+"===="+e.point.lng);
                    var title = e.target.K.title;
                    var addComp = rs.addressComponents;
                    var sContent = addComp.province + ", " + addComp.city + ", " +addComp.district+","+ addComp.street + ", " + addComp.streetNumber+","+title ;
                    alert(addComp.province);
                    document.getElementById("confirmPlace").value=sContent;
                    document.getElementById("flocation").value=sContent;
                });
               $.prompt.close();
             },5000);

          });*/

          /* gc.getLocation(e.point, function(rs){
		    	var title = e.target.K.title;
		    	var addComp = rs.addressComponents;  
		        var sContent = addComp.province + ", " + addComp.city + ", " +addComp.district+","+ addComp.street + ", " + addComp.streetNumber+","+title ;
		       alert(addComp.province);
               document.getElementById("confirmPlace").value=sContent;
			    document.getElementById("flocation").value=sContent;
		    });*/
		  /*   document.getElementById("lat").value=e.point.lat;
			 document.getElementById("lng").value=e.point.lng;*/
		    /*弹出框
			var infoWindow = new BMap.InfoWindow(sContent, { enableMessage: false });
			this.openInfoWindow(infoWindow);*/



      }
	   }
	});
}


function clickMaker(){

var gc = new BMap.Geocoder();//地址解析类 
//添加标记点击监听  
marker.addEventListener("click", function(e){  
   gc.getLocation(e.point, function(rs){  
        showLocationInfo(e.point, rs);  

    });  
   
});  

}

//显示地址信息窗口  
function showLocationInfo(pt, rs){  
    var opts = {  
      width : 250,     //信息窗口宽度  
      height: 100,     //信息窗口高度  
      title : ""  //信息窗口标题  
    }  
      
    var addComp = rs.addressComponents;  
    var addr = addComp.province + ", " + addComp.city + ", " + addComp.district + ", " + addComp.street + ", " + addComp.streetNumber + "<br/>";  
    addr += "纬度: " + pt.lat + ", " + "经度：" + pt.lng;  
    //alert(addr);  
      
    var infoWindow = new BMap.InfoWindow(addr, opts);  //创建信息窗口对象  
    marker.openInfoWindow(infoWindow);  
}

function showMap(){
    var map2 = new BMap.Map("map_view");
    map2.addControl(new BMap.NavigationControl());
    map2.addControl(new BMap.ScaleControl());
    map2.addControl(new BMap.OverviewMapControl());
    map2.addControl(new BMap.MapTypeControl());
    var lat =  document.getElementById("lat").value;
    var lng =  document.getElementById("lng").value

    var vpoint = new BMap.Point(lng, lat);

// 创建地址解析器实例
    var myGeo = new BMap.Geocoder();

    // 根据坐标得到地址描述
    myGeo.getLocation(new BMap.Point(lng, lat), function(result){
        if (result){
           // alert(lat+"&"+lng+result.address);
            map2.centerAndZoom(vpoint, 16);
            map2.addOverlay(new BMap.Marker(vpoint));
        }
    });

}



