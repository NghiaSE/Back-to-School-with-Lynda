// Global variable, used with caution
SCRIPT = "";
chapterId = 0;
IDM = '"%ProgramFiles%\\Internet Download Manager\\IDMan.exe"';
courseId = $("#course-page").attr("data-course-id");

function fixString(s){
	return s.replace(/([\u2713\u2714]|\?|\*)/g,"").replace(/("+|`+)/g,"'").replace(/\s+vs\.\s+/g," vs ").replace(/:/g," - ").replace(/\s+and\s+/g," & ").replace(/,*\s*&\s*/g," & ").replace(/“/g,"'").replace(/”/g,"'").replace(/’/g,"'").replace(/%/g,"%%").replace(/(>|<|\||\/|\\)/g,"--").replace(/\s+/g," ").replace(/\.{1,}$/g,"").trim();
}

// (1) convert # to %23, (2) double % used in batch file 
function encoreUrl(url){
	return url.replace(/#/g,"%%23");
}

function generateScript(chapterName, videosDOM){
	if(chapterName.length==0){
		chapterName = "0. Intro";
	}

	console.log("___chapterName=" + chapterName);

	let chapterRegExPattern = /^\d+\..+$/;
	if(!chapterRegExPattern.test(chapterName)){
		chapterName = chapterId + '. ' + chapterName;
	}

	let DLScript = 'md "%~dp0' + chapterName + '"\r\n';
	chapterId++;

	let i = 0;
	// Detect if filename index is required: None if only 1 video
	let fileIndexRequired = true;
	if($(videosDOM).length <= 1){
		fileIndexRequired = false;
	}

	$(videosDOM).each(function(){
		
		var videoId = $(this).attr("data-video-id");
		var videoName = fixString($(this).children().first().children().first().children().filter(".item-name").text());

		$.ajax({
			url: "https://www.lynda.com/ajax/player?videoId=" + videoId + "&type=video",
			async: false,
			type: "get",
			dataType: "json",
			success: function(data){

				if(data.PrioritizedStreams === undefined){
					return true;
				}

				// assume HD720 which is currently highest quality video
				let videoURL = data.PrioritizedStreams[0][720];

				if(videoURL === undefined){
					videoURL = data.PrioritizedStreams[0][540];

					if(videoURL === undefined){
						videoURL = data.PrioritizedStreams[0][360];
					}
				}

				let fileIndex = "";
				if(fileIndexRequired){
					i = i + 1; // Video Id 1,2,3..
					fileIndex = i  + '. ';
				}
				
				DLScript = DLScript + IDM + ' /a /d "' + encoreUrl(videoURL) + '" /f "' + fileIndex + videoName + '.mp4" /p "%~dp0' + chapterName + '"\r\n';
				
				// Download Transcript/Closed Caption (.srt file)
				// Example: https://www.lynda.com/ajax/player/transcript?courseId=373100&videoId=474437
				let subtitleURL = "https://www.lynda.com/ajax/player/transcript?courseId=" + courseId + "&videoId=" + videoId

				DLScript = DLScript + IDM + ' /a /d "' + encoreUrl(subtitleURL) + '" /f "' + fileIndex + videoName + '.srt" /p "%~dp0' + chapterName + '"\r\n';
			}
		});
	});

	return DLScript;
}


// Download Exercise
$.ajax({
	url: "https://www.lynda.com/ajax/ExerciseFiles/" + courseId,
	async: false,
	type: "post",
	dataType: "json",
	success: function(data){
		if(data.hasExercises){
			let exerciseFolder = "Exercise Files";
			SCRIPT += 'md "%~dp0' + exerciseFolder + '"\r\n';
			
			exerciseFileId = data.exercises[0].ExerciseFileId;

			for(let i=0; i<data.exercises.length; i++){
				let fileName = data.exercises[i].FileName;
				fileName = fixString(fileName);
				SCRIPT += IDM + ' /a /d "' + data.exercises[i].CdnUrl + '" /f "' + fileName + '" /p "%~dp0' + exerciseFolder + '"\r\n';
			}
		}
	}
});


// Create Chapter Directories
$("ul[class^='course-toc'] > li[role='presentation']").each(function(){
	let chapterName = fixString($(this).children().first().children().first().children().last().text());
	let videosDOM = $(this).children().last().children().filter(".toc-video-item");

	SCRIPT += generateScript(chapterName, videosDOM);
});

SCRIPT += IDM + " /s\r\n"; 

copy(SCRIPT); // save to clipboard
