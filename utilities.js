var debug = true;

var log = function(str)
{
	if (debug) console.log(str);
}

if (typeof String.prototype.startsWith != 'function') {
	String.prototype.startsWith = function (str){
		return this.indexOf(str) == 0;
	};
}