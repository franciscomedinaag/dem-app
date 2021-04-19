import { ThrowStmt } from '@angular/compiler';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataApiService } from 'src/app/services/data-api.service';
import { GlobalService } from 'src/app/services/global.service';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-productos-tienda',
  templateUrl: './productos-tienda.component.html',
  styleUrls: ['./productos-tienda.component.css']
})
export class ProductosTiendaComponent implements OnInit {
  
  constructor(private api:DataApiService, private toast:ToastService, private global:GlobalService, public activated:ActivatedRoute) { }
  
  ngOnInit(): void {
    this.tiendaId=this.activated.snapshot.paramMap.get("id");
    this.getTienda(this.tiendaId)
    this.getProductos(this.tiendaId);
  }
  
  displayPrecio: boolean=false;
  productos:any=[]
  allProductos:any=[]
  variantes:any=[]
  editedPrices:any=[]
  tiendaId:any
  tienda:any
  nuevoProducto:any={odoo_sync:true}

  getTienda(id:number){
    if(this.global.getPermiso()=="admin"){
      this.api.get('/getOneRow',{table:"tienda", field:"id", value:id})
      .subscribe((tienda:any)=>{
        this.tienda=tienda.data[0];
      })
    }
  }

  getProductos(id:number){
    if(this.global.getPermiso()=="admin"){
      this.api.get('/getRegisteredProducts',{storeId:id})
      .subscribe((productos:any)=>{
        console.log(productos)
        this.productos=productos.products;
        this.getAllProductos()
      })
    }
  }

  deleteProduct(id:number){
    if(confirm("Si eliminas este producto debes eliminarlo también de cada Shopify en el que se encuentre")){
      let params={
        table:"productos_registrados",
        id:id
      }
       this.api.post('/deleteRow',params)
       .subscribe((response:any)=>{
         this.getProductos(this.tiendaId)
       })
    }
  }

  getAllProductos() {
    if(this.global.getPermiso()=="admin"){
      this.api.get('/getRows',{table:"productos_odoo"})
      .subscribe((productos:any)=>{
        this.allProductos=productos.data;
        // this.productos.forEach((product:any) => { 
        //   this.allProductos.some((e:any) => {
        //     if(e.nombre == product.nombre){
        //       this.allProductos=this.allProductos.filter((el:any) => { return el.id != e.id }); 
        //     }
        //   }) 
        // })
      })
    }
  }

  agregarProducto(){
    if(this.nuevoProducto.id!==undefined && this.nuevoProducto.odoo_sync!==undefined){
      let desc="..." //obtener descripcion del producto por su id
      if(this.nuevoProducto.odoo_sync==false && this.nuevoProducto.precio_custom > 0){
        let values=[this.nuevoProducto.precio_custom, desc, false, this.nuevoProducto.id, this.tiendaId]
        this.doProductPost("productos_registrados", values);
      }
      else if(this.nuevoProducto.odoo_sync){
        let values=[0, desc, true, this.nuevoProducto.id, this.tiendaId]
        this.doProductPost("productos_registrados", values);
      }
      else{
        this.toast.showError("Revisa tus valores")
        return
      }
    }
    else{
      this.toast.showError("Debes llenar los campos")
      return
    }
  }

  async doProductPost(table:string, values:any){
    let productOdooId=values[3]
    this.api.get('/getOneRow',{table:"variante", field:"productOdooId", value:values[3]})
    .subscribe((variantes:any)=>{
      this.variantes=variantes.data;
      let variantValues:Array<Array<any>>=[]  
      this.variantes.forEach((variant:any, i:number) => {
         let id=variant.id 
         variantValues[i]=[]
         variantValues[i][0]=values[0]
         variantValues[i][1]=values[1]
         variantValues[i][2]=values[2]
         variantValues[i][3]=id
         variantValues[i][4]=values[4]
      });
      let apiParams={table:table, values:variantValues, productOdooId:productOdooId}
      this.api.post('/addProductToStore',apiParams)
        .subscribe((done:any)=>{
            this.toast.showSuccess("Agredado")  
            this.nuevoProducto={odoo_sync:true}
            this.getProductos(this.tiendaId);
        },(err)=>{
          this.toast.showError("Error en el servidor")
        })
    })
  }

  checkSwitch(){
    this.nuevoProducto.odoo_sync=!this.nuevoProducto.odoo_sync
    if(this.nuevoProducto.odoo_sync){
      this.displayPrecio=false
    }
    else{
      this.displayPrecio=true;
    }
  }

  async getVariantes(id:number){
    if(this.global.getPermiso()=="admin"){
      this.api.get('/getOneRow',{table:"variante", field:"productOdooId", value:id})
      .subscribe((variantes:any)=>{
        this.variantes=variantes.data;
        console.log(this.variantes)
        return this.variantes
      })
    }
  }

  cambiarPrecio(){
    let nuevosPrecios:any=[]
    let zero=false;
    this.editedPrices.forEach((product:any) => {
      if(!product.odoo_sync){
        if(product.precio_custom > 0){
          nuevosPrecios.push({tiendaId:this.tiendaId, precio:product.precio_custom, variantId:product.id, odoo_sync:false, shopifyId:product.shopifyId, shopifyVariantId:product.shopifyVariantId})
        }
        else{
          this.toast.showError("El precio debe ser mayor de 0")
          zero=true
        }
      }
      else{
        nuevosPrecios.push({tiendaId:this.tiendaId, precio:0, variantId:product.id, odoo_sync:true, shopifyId:product.shopifyId, shopifyVariantId:product.shopifyVariantId})
      }
    });
    
    if(nuevosPrecios.length && !zero){
      this.api.post('/editStorePrices', nuevosPrecios)
      .subscribe((done:any)=>{
        console.log("ok")
      })
      this.editedPrices=[]
    }
    else{
      this.toast.showInfo("No hiciste cambios")
    }
  }

}
