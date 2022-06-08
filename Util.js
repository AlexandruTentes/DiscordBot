module.exports = String.prototype.regexIndexOf = function(regex, poz)
{
    poz = poz || 0;
    let index = this.substring(poz).search(regex);
    return (index >= 0 ? index + poz : index);
}

module.exports = normalize_string = function(str)
{
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

module.exports = get_time_now = function()
{
    return new Date().getTime() / 1000;
}

module.exports = sleep = function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = String.prototype.getFirstWords = function(chars, count)
{
    let output = [];
    let temp = "";
    let flag = false;
    let word_count = 0;
    let i = 0;

    for(i; i < this.length; i++)
    {
        if(word_count >= count)
            return { data : output, index : i - 1};

        while(chars.includes(this[i]))
        {
            i++;
            flag = true;
        }

        if(flag)
        {
            output[word_count] = temp;
            word_count++;
            flag = false;
            temp = "";
        }

        temp += this[i];
    }
    
    output[word_count] = temp;
    return { data : output, index : i - 1};
}

module.exports = String.prototype.unicodeToChar = function () 
{
    return this.replace(/\\u[\dA-F]{4}/gi, function (match) 
    {
        return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
    });
 }