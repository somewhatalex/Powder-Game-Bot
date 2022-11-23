const axios = require("axios");
const cheerio = require("cheerio");
const Discord = require("discord.js");
const { Permissions } = require('discord.js');
var fs = require('fs'), request = require('request');

function unhex(string) {
  return decodeURIComponent(string.replace(/\s+/g, '').replace(/[0-9a-f]{2}/g, '%$&'));
}

function median(numbers) {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}

function ranksuffix(i) {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return i + "st";
    }
    if (j == 2 && k != 12) {
        return i + "nd";
    }
    if (j == 3 && k != 13) {
        return i + "rd";
    }
    return i + "th";
}

async function fetchHTML(url) {
  const { data } = await axios.get(url)
  return cheerio.load(data)
}

async function getStats(area, user, message) {
  console.log("scraping...");
  let finalOutput = [];

  let finalvotes = 0;
  let finaluploads = 0;
  let page = 0;

  let voteDistro = []
  let labels = []

  let stopPage = false;
  let titleafter = null;

  try {

  while(!stopPage) {
    let $;
    if(area === "pg") {
      $ = await fetchHTML("https://dan-ball.jp/en/javagame/dust/search/?o=v&e=2&k=0&t=a&m=0&p=" + page + "&s=" + user);
    } else {
      $ = await fetchHTML("https://dan-ball.jp/en/javagame/dust2/search.php?o=v&e=2&k=0&t=a&m=0&p=" + page + "&s=" + user);
    }


    let scriptContents = $('script:not([src])')[3].children[0].data;

    if(!scriptContents.includes("dust12_search(")) {
      stopPage = true;
    } else {
      scriptContents = scriptContents.replace(/\[/g, "");
      scriptContents = scriptContents.replace(/\]/g, "");
      scriptContents = scriptContents.split(",");

      let totalvotes = 0;
      let topUploadName = unhex(scriptContents[3]);

      for(let i=0; i<20; i++) {
        if(!isNaN(parseInt(scriptContents[5 + i*7]))) {
          finaluploads++;
          totalvotes = totalvotes + parseInt(scriptContents[5 + i*7]);
          voteDistro.push(parseInt(scriptContents[5 + i*7]));
        }
      }
      finalvotes = finalvotes + totalvotes;

      let topUploadId = scriptContents[2];
      let topUploadURL = null;
      if(area === "pg") {
        topUploadURL = "https://dan-ball.jp/en/javagame/dust/?code=" + topUploadId;
        topUploadImg = "http://dan-ball.jp/images/dust/"+ (Math.floor(topUploadId/1000)*1000) + "/"+ topUploadId +".gif"
        titleafter = "Powder Game";
      } else {
        topUploadURL = "https://dan-ball.jp/en/javagame/dust2/?code=" + topUploadId;
        topUploadImg = "http://dan-ball.jp/images/dust2/"+ Math.floor(topUploadId/1000) + "/"+ topUploadId +".png"
        titleafter = "Powder Game 2";
      }
      let topUploadVotes = scriptContents[5];

      finalOutput.push([finalvotes, finaluploads, topUploadId, topUploadURL, topUploadImg, topUploadName]);

      page++;
    }
  }
  
  let userrank = 0;
  if(area === "pg2") {
    userrank = Math.round(4.13*Math.pow(10, 7)*(1/Math.pow(finalOutput[finalOutput.length-1][0], 1.82))); //modeled based on top 99 users total (sorry skyk)
    
    if(userrank > 10000) { //dealing with high numbers as the model is less accurate
      userrank = Math.round(10000 + Math.sqrt(userrank-10000));
    } else if (userrank < 1) { //skyk moment (his vote count was so large that I had to exclude him from the dataset, so his thing messes it up and returns 0)
      userrank = 1;
    }
  } else if(area === "pg") {
    userrank = Math.round(4.45*Math.pow(10, 11)*(1/Math.pow(finalOutput[finalOutput.length-1][0], 2.24))); //modeled based on top 100 users
    
    if(userrank > 40000) { //dealing with high numbers as the model is less accurate
      userrank = Math.round(40000 + Math.sqrt(userrank-40000));
    } else if (userrank < 1) {
      userrank = 1;
    }
  }

  userrank = ranksuffix(userrank);

  const QuickChart = require('quickchart-js');

  const myChart = new QuickChart();
  for(let i=0; i<voteDistro.length; i++) {
    labels.push(i+1);
  }
  myChart
    .setConfig({
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Votes",
          data: voteDistro
        }]
      },
      options: {
        title: {
          display: true,
          text: "Distribution of Votes in Each of " + decodeURIComponent(user) + "'s Uploads By Rank",
          fontSize: 20,
        }
      }
    })
    .setWidth(800)
    .setHeight(400);

  const chartImageUrl = myChart.getUrl();

  try {
  var download = function(uri, filename, callback){
    request.head(uri, function(err, res, body){
      console.log('content-type:', res.headers['content-type']);
      console.log('content-length:', res.headers['content-length']);

      request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
  };

  download(chartImageUrl, user + ".png", function(){
      try {
      const attachment = new Discord.MessageAttachment(user + ".png", user + ".png");
      const ggEmbed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setAuthor("Powder Game Bot", "https://cdn.discordapp.com/avatars/913232452082884638/3914feaccbac6950065fd4961d2e1cfe.png?size=256")
        .setTitle(decodeURIComponent(user) + "'s " + titleafter + " Stats")
        .attachFiles(attachment)
        .setThumbnail(finalOutput[0][4])
        .addFields(
          { name: "Total Vote Count", value: finalOutput[finalOutput.length-1][0] },
          { name: "User Rank in " + titleafter + " (estimate)", value: userrank },
          { name: "Total Projects", value: finalOutput[finalOutput.length-1][1] },
          { name: "Average Votes/Project", value: Math.round((finalOutput[finalOutput.length-1][0]/finalOutput[finalOutput.length-1][1])*100)/100},
          { name: "Median Votes/Project", value: median(voteDistro) },
          { name: "Best Upload", value: "[\"" + finalOutput[0][5].substring(1, finalOutput[0][5].length-1) + "\"](" + finalOutput[0][3] + ") with " + voteDistro[0] + " votes"},
        )
        .setDescription("Here's some stats for " + decodeURIComponent(user))
        .setImage("attachment://" + user.replace(/%/g, "").replace(/\'/g, "").replace(/\"/g, "") + ".png")
      message.channel.send(ggEmbed).then(()=> {
        fs.unlinkSync("/home/runner/Powder-Game-Bot/" + user + ".png");
      });
      } catch(e) {
        const ggEmbed = new Discord.MessageEmbed()
          .setColor('#0099ff')
          .setAuthor("Powder Game Bot", "https://cdn.discordapp.com/avatars/913232452082884638/3914feaccbac6950065fd4961d2e1cfe.png?size=256")
          .setTitle("Oops... An Error Occured")
          .setDescription("Not enough information exists yet for this user.")
        message.reply(ggEmbed);
        try {
          fs.unlinkSync("/home/runner/Powder-Game-Bot/" + user + ".png");
        } catch(e) {
          console.log(e);
        }
        console.log(e);
        console.log(e.message);
      }
  });
  } catch (e) {
    console.log(e);
    console.log(e.message);
  }

  } catch(e) {
    const ggEmbed = new Discord.MessageEmbed()
      .setColor('#0099ff')
      .setAuthor("Powder Game Bot", "https://cdn.discordapp.com/avatars/913232452082884638/3914feaccbac6950065fd4961d2e1cfe.png?size=256")
      .setTitle("Oops... An Error Occured")
      .setDescription("Not enough information exists yet for this user.")
    message.reply(ggEmbed);
    console.log(e);
    console.log(e.message);
  }
}

module.exports.stats = getStats;