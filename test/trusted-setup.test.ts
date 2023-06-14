import vKey from "../package/src/verifier/hydra-s3-verification-key.json";
import { expect } from "chai";

describe("Trusted setup", () => {
    let verificationKey = {
        "protocol": "groth16",
        "curve": "bn128",
        "nPublic": 14,
        "vk_alpha_1": [
         "20491192805390485299153009773594534940189261866228447918068658471970481763042",
         "9383485363053290200918347156157836566562967994039712273449902621266178545958",
         "1"
        ],
        "vk_beta_2": [
         [
          "6375614351688725206403948262868962793625744043794305715222011528459656738731",
          "4252822878758300859123897981450591353533073413197771768651442665752259397132"
         ],
         [
          "10505242626370262277552901082094356697409835680220590971873171140371331206856",
          "21847035105528745403288232691147584728191162732299865338377159692350059136679"
         ],
         [
          "1",
          "0"
         ]
        ],
        "vk_gamma_2": [
         [
          "10857046999023057135944570762232829481370756359578518086990519993285655852781",
          "11559732032986387107991004021392285783925812861821192530917403151452391805634"
         ],
         [
          "8495653923123431417604973247489272438418190587263600148770280649306958101930",
          "4082367875863433681332203403145435568316851327593401208105741076214120093531"
         ],
         [
          "1",
          "0"
         ]
        ],
        "vk_delta_2": [
         [
          "14224678160608123428577879731596824888551385460032914677899463967517092526373",
          "5947204102927678610499403231647051947521117072329097157305165208669196293315"
         ],
         [
          "149734489293243356395158312120537682710631495908615027499265582205314452224",
          "17288202048179071253685552100101604797295876547572541738450181624714689114869"
         ],
         [
          "1",
          "0"
         ]
        ],
        "vk_alphabeta_12": [
         [
          [
           "2029413683389138792403550203267699914886160938906632433982220835551125967885",
           "21072700047562757817161031222997517981543347628379360635925549008442030252106"
          ],
          [
           "5940354580057074848093997050200682056184807770593307860589430076672439820312",
           "12156638873931618554171829126792193045421052652279363021382169897324752428276"
          ],
          [
           "7898200236362823042373859371574133993780991612861777490112507062703164551277",
           "7074218545237549455313236346927434013100842096812539264420499035217050630853"
          ]
         ],
         [
          [
           "7077479683546002997211712695946002074877511277312570035766170199895071832130",
           "10093483419865920389913245021038182291233451549023025229112148274109565435465"
          ],
          [
           "4595479056700221319381530156280926371456704509942304414423590385166031118820",
           "19831328484489333784475432780421641293929726139240675179672856274388269393268"
          ],
          [
           "11934129596455521040620786944827826205713621633706285934057045369193958244500",
           "8037395052364110730298837004334506829870972346962140206007064471173334027475"
          ]
         ]
        ],
        "IC": [
         [
          "15804039062076515439582959715370558033804154193866522341418754355668990462463",
          "14939234806441587795059437678090138171548169820036013147603129099484876497888",
          "1"
         ],
         [
          "17574099665254781488550735230757110542636506152573426744849028384901539447834",
          "3927094394137710135730929374514051635184205592284228368582427365637193371478",
          "1"
         ],
         [
          "9762792643860714667870459409829319206401350900356336674495197055016888347275",
          "18011293241658362804015579521445734125489181919616086649848127919014030202617",
          "1"
         ],
         [
          "12385252027129960806367476060506785456640618304875711338328852423495008033193",
          "2256281551738685056734503912816912194783421393639894027582305404920448584611",
          "1"
         ],
         [
          "12247901969505332851838456541737930986611048720900878028687799331466965383842",
          "5115609312285538203135871902829659589761308200724699442187397112545827242173",
          "1"
         ],
         [
          "11289605047556317740236530000963603385851604359744689361183618857858421877521",
          "19122455760122586485775453836298363226577664525631024704803123477357473094043",
          "1"
         ],
         [
          "2322876912700451715031374305648626862215611567247273525695988059790159746810",
          "2833384466700074206789333374865206116513035916663953405111392576772057157895",
          "1"
         ],
         [
          "16852621322621637269216093075383452648190232466483906496500195087093537821687",
          "16325902168855819449916931199158908046645784592255315061212458299577977500520",
          "1"
         ],
         [
          "9045291403758161491548366531866376141086206305461740421071148072806301607210",
          "7799395230289644965330878409566581713230101235604913638470280886524557452953",
          "1"
         ],
         [
          "10726025683042374714997923063769115768988772976131031693465276911424894725172",
          "21790757495856406681981524211041114449350804812015195716893718875902541595802",
          "1"
         ],
         [
          "13337209230583799459425148796693319956661189063060254833524470238213205422890",
          "1597162274238127771814604231410975565645772671656985460391877169548544646597",
          "1"
         ],
         [
          "20136331305168156006793572365329011003514170402815615710784798926522979694800",
          "17567773802823829574949144493039157073893781951846322473131615675225838529142",
          "1"
         ],
         [
          "13868116397658767466954299980068241431473329446954116983719941174605169496246",
          "11930013804658906764937772303961699551383482058765795634756016067872875240002",
          "1"
         ],
         [
          "19719975179921156451295023853307550118005040694701267473353189519853678396671",
          "10634504646767467477946207833174471932211627037854767452071106721407106991734",
          "1"
         ],
         [
          "21615447561552586718749473908482646469096544954209340826760900621642356459600",
          "14223436823634552417735476264987577965820114975514698971620328268267537852060",
          "1"
         ]
        ]
       }


    it("Should verify that the zkey was not re-generated", async () => {
        expect(vKey).to.deep.equal(verificationKey);
    });
});
  