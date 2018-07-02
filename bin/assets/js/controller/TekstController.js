import TekstModel from '../model/TekstModel';


export default class TekstController {

	constructor(){
		this.Button = document.getElementById('test');
		this.Button.addEventListener('click', () => {
            console.log("click")
			var newMemo = new TekstModel({
                message: "Test!!!"
            })
		}
	}

}