import TekstModel from '../model/TekstModel';


export default class TekstController {
	test(){
		var newMemo = new TekstModel({
                message: "Test!!!"
            });
	}
}