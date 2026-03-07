using System;
using System.Collections.Generic;
using System.Linq; 
using System.Reflection;
// using Microsoft.AspNetCore.Identity.Data; // このUsingは不要そうなのでコメントアウト
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace visualizeApp.Services
{
    public class CodeAnalysis
    {
        public static int id = 0;
        public static List<int> preId = new List<int>();
        public static List<string> preType = new List<string>();
        public static int depth = 0;
        private static JsonExporter jsonHandler = new JsonExporter();
        static bool isElse = false;
        private readonly object _analysisLock = new();

        public PadDiagram? CurrentPadDiagram => jsonHandler.CurrentPadDiagram;
        public CallGraphData? CurrentCallGraph => jsonHandler.CurrentCallGraph;

        // MetadataReferenceのリストは一度だけ作成すれば良い
        private List<MetadataReference> references = new List<MetadataReference>
        {
            MetadataReference.CreateFromFile(typeof(object).Assembly.Location),        // mscorlib
            MetadataReference.CreateFromFile(typeof(Console).Assembly.Location),       // System.Console
            MetadataReference.CreateFromFile(typeof(Enumerable).Assembly.Location),    // System.Linq
            MetadataReference.CreateFromFile(typeof(List<>).Assembly.Location),        // System.Collections.Generic
            MetadataReference.CreateFromFile(Assembly.Load("System.Runtime").Location) // System.Runtime
        };


        private static string currentClassName = "";
        private static string currentMethodName = "";

        public static List<(
            string ClassName,
            string MethodName,
            string Parameters 
        )> methodList = new();

        public static List<(string source, string target)> linkCallGraph = new();

        // SemanticModelを静的フィールドから削除

        public void Entry(string code)
        {
            methodList.Clear();
            linkCallGraph.Clear();
            preId.Clear();
            preType.Clear();
            id = 0;
            depth = 0;
            isElse = false;

            SyntaxTree tree = CSharpSyntaxTree.ParseText(code);

            // CompilationはMetadataReferenceのリストを受け取る
            var compilation = CSharpCompilation.Create("SemanticModel", new[] { tree }, references); // ここで 'references' を使用
            // SemanticModelを取得
            SemanticModel localSemanticModel = compilation.GetSemanticModel(tree); // ローカル変数として保持

            CompilationUnitSyntax root = tree.GetCompilationUnitRoot();

            foreach (var classDecl in root.Members.OfType<ClassDeclarationSyntax>())
            {
                currentClassName = classDecl.Identifier.Text;
                // AnalyzeClassにSemanticModelを渡す
                AnalyzeClass(classDecl, localSemanticModel);
            }
            jsonHandler.SaveCallGraph(methodList, linkCallGraph);
            jsonHandler.saveFile();
        }

        public void ClearCurrentData()
        {
            jsonHandler.ClearCurrentData();
        }

        public (PadDiagram? PadDiagram, CallGraphData? CallGraph) AnalyzeSnapshot(string code)
        {
            lock (_analysisLock)
            {
                Entry(code);
                return (
                    ClonePadDiagram(jsonHandler.CurrentPadDiagram),
                    CloneCallGraph(jsonHandler.CurrentCallGraph)
                );
            }
        }

        private static PadDiagram? ClonePadDiagram(PadDiagram? source)
        {
            if (source == null)
            {
                return null;
            }

            return new PadDiagram
            {
                Nodes = source.Nodes.Select(n => new Node
                {
                    Id = n.Id,
                    Type = n.Type,
                    Label = n.Label,
                    Class = n.Class,
                    Method = n.Method,
                    Depth = n.Depth,
                    LineNumber = n.LineNumber
                }).ToList(),
                Links = source.Links.Select(l => new Link
                {
                    Node1 = l.Node1,
                    Node2 = l.Node2,
                    Type = l.Type,
                    Class = l.Class,
                    Method = l.Method
                }).ToList()
            };
        }

        private static CallGraphData? CloneCallGraph(CallGraphData? source)
        {
            if (source == null)
            {
                return null;
            }

            return new CallGraphData
            {
                Nodes = source.Nodes.Select(n => new CallGraphNode
                {
                    Id = n.Id,
                    Label = n.Label,
                    Parameters = n.Parameters
                }).ToList(),
                Links = source.Links.Select(l => new CallGraphLink
                {
                    Source = l.Source,
                    Target = l.Target
                }).ToList()
            };
        }

        static void AnalyzeClass(ClassDeclarationSyntax classDecl, SemanticModel semanticModel) // semanticModelを引数に追加
        {
            foreach (var methodDecl in classDecl.Members.OfType<MethodDeclarationSyntax>())
            {
                id = 0; 
                depth = 0; 
                preId.Clear();
                preType.Clear();
                isElse = false;
                currentMethodName = methodDecl.Identifier.Text;
                var methodSymbol = semanticModel.GetDeclaredSymbol(methodDecl) as IMethodSymbol;
                string paramText = "";

                if (methodSymbol != null && methodSymbol.Parameters.Length > 0)
                {
                    paramText = string.Join(",",
                        methodSymbol.Parameters.Select(p =>
                            $"{p.Type.ToDisplayString()} {p.Name}"
                        )
                    );
                }

                // ★ ここで parameter 文字列を保持
                methodList.Add((
                    currentClassName,
                    currentMethodName,
                    paramText
                ));
                AnalyzeStatements(methodDecl.Body.Statements, semanticModel);
            }
        }

        static void AnalyzeStatements(SyntaxList<StatementSyntax> statements, SemanticModel semanticModel) // semanticModelを引数に追加
        {
            foreach (var statement in statements)
            {
                var lineSpan = statement.GetLocation().GetLineSpan();
                int lineNumber = lineSpan.StartLinePosition.Line + 1;
                if (statement is ExpressionStatementSyntax exprStmt)
                {
                    if (exprStmt.Expression is InvocationExpressionSyntax invocation)
                    {
                        // ここで渡すinvocationが、このsemanticModelのツリーに属していることを保証
                        var symbol = semanticModel.GetSymbolInfo(invocation).Symbol as IMethodSymbol;

                        // ▼ ここを修正：nullチェック + 自作メソッドかチェック
                        if (symbol != null && symbol.Locations.Any(loc => loc.IsInSource))
                        {
                            string calledClass = symbol.ContainingType.ToDisplayString(); // 呼び出し先クラス名
                            string calledMethod = symbol.Name;                            // 呼び出し先メソッド名

                            string argumentText = GetArgumentText(invocation);

                            jsonHandler.addNode(id, "methodCall", invocation.ToString() + "/,,,/" + calledClass + "." + calledMethod, depth, currentClassName, currentMethodName, lineNumber);
                            CreateLink("expression"); // ← この関数はstaticなので、直接呼び出し
                            SaveCondition("expression"); // ← この関数はstaticなので、直接呼び出し
                            linkCallGraph.Add((currentClassName + "." + currentMethodName, calledClass + "." + calledMethod));
                        }
                        else
                        {
                            jsonHandler.addNode(id, "expression", exprStmt.Expression.ToString(), depth, currentClassName, currentMethodName, lineNumber);
                            CreateLink("expression");
                            SaveCondition("expression");
                        }
                    }
                    else
                    {
                        jsonHandler.addNode(id, "expression", exprStmt.Expression.ToString(), depth, currentClassName, currentMethodName, lineNumber);
                        CreateLink("expression");
                        SaveCondition("expression");
                    }
                    id++;
                }
                else if (statement is LocalDeclarationStatementSyntax localDeclStmt)
                {
                    var invocation = localDeclStmt
                        .DescendantNodes()
                        .OfType<InvocationExpressionSyntax>()
                        .FirstOrDefault();

                    if (invocation != null)
                    {
                        var symbol = semanticModel.GetSymbolInfo(invocation).Symbol as IMethodSymbol;

                        if (symbol != null && symbol.Locations.Any(loc => loc.IsInSource))
                        {
                            string calledClass = symbol.ContainingType.ToDisplayString();
                            string calledMethod = symbol.Name;

                            jsonHandler.addNode(
                                id,
                                "methodCall",
                                localDeclStmt.ToString() + "/,,,/" + calledClass + "." + calledMethod,
                                depth,
                                currentClassName,
                                currentMethodName,
                                lineNumber
                            );

                            CreateLink("expression");
                            SaveCondition("expression");

                            linkCallGraph.Add((
                                currentClassName + "." + currentMethodName,
                                calledClass + "." + calledMethod
                            ));
                        }
                        else
                        {
                            jsonHandler.addNode(id, "localDeclaration", localDeclStmt.ToString(), depth, currentClassName, currentMethodName, lineNumber);
                            CreateLink("localDecl");
                            SaveCondition("localDecl");
                        }
                    }
                    else
                    {
                        jsonHandler.addNode(id, "localDeclaration", localDeclStmt.ToString(), depth, currentClassName, currentMethodName, lineNumber);
                        CreateLink("localDecl");
                        SaveCondition("localDecl");
                    }

                    id++;
                }

                else if (statement is IfStatementSyntax ifStmt)
                {
                    jsonHandler.addNode(id, "if", ifStmt.Condition.ToString(), depth, currentClassName, currentMethodName, lineNumber);
                    CreateLink("if");
                    SaveCondition("if");
                    if (isElse)
                    {
                        isElse = false;
                    }
                    id++;
                    int tmp = depth;
                    depth++;
                    // 再帰呼び出しにもsemanticModelを渡す
                    AnalyzeStatements(ifStmt.Statement is BlockSyntax ifBlock
                        ? ifBlock.Statements
                        : SyntaxFactory.SingletonList(ifStmt.Statement), semanticModel); // semanticModelを渡す
                    depth--;
                    DeleteCondition();
                    depth++;

                    ElseClauseSyntax? elseClause = ifStmt.Else;

                    while (elseClause != null)
                    {
                        if (elseClause.Statement is IfStatementSyntax elseIfStmt)
                        {
                            var elseIfLine =
                                elseIfStmt.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
                            jsonHandler.addNode(id, "else if", elseIfStmt.Condition.ToString(), depth, currentClassName, currentMethodName, elseIfLine);
                            CreateLink("else if");
                            SaveCondition("else if");
                            id++;
                            depth++;
                            // 再帰呼び出しにもsemanticModelを渡す
                            AnalyzeStatements(elseIfStmt.Statement is BlockSyntax elseIfBlock
                                ? elseIfBlock.Statements
                                : SyntaxFactory.SingletonList(elseIfStmt.Statement), semanticModel); // semanticModelを渡す
                            elseClause = elseIfStmt.Else;
                            depth--;
                            DeleteCondition();
                            depth++;
                        }
                        else
                        {
                            isElse = true;
                            // 再帰呼び出しにもsemanticModelを渡す
                            AnalyzeStatements(elseClause.Statement is BlockSyntax elseBlock
                                ? elseBlock.Statements
                                : SyntaxFactory.SingletonList(elseClause.Statement), semanticModel); // semanticModelを渡す
                            depth--;
                            DeleteCondition();
                            depth++;
                            isElse = false;
                            break;
                        }
                    }
                    depth = tmp;
                    DeleteCondition(); // このDeleteConditionはelse/else ifブロックの後に呼ばれるべきか、ロジック要確認
                }
                else if (statement is ForStatementSyntax forStmt)
                {
                    string forDetails = $"{string.Join(", ", forStmt.Declaration.Variables)};{forStmt.Condition};{forStmt.Incrementors}";
                    jsonHandler.addNode(id, "loop", forDetails, depth, currentClassName, currentMethodName, lineNumber);
                    CreateLink("loop");
                    SaveCondition("loop");
                    id++;
                    depth++;
                    // 再帰呼び出しにもsemanticModelを渡す
                    AnalyzeStatements(forStmt.Statement is BlockSyntax forBlock
                        ? forBlock.Statements
                        : SyntaxFactory.SingletonList(forStmt.Statement), semanticModel); // semanticModelを渡す
                    depth--;
                    DeleteCondition();
                }
                else if (statement is WhileStatementSyntax whileStmt)
                {
                    jsonHandler.addNode(id, "loop", whileStmt.Condition.ToString(), depth, currentClassName, currentMethodName, lineNumber);
                    CreateLink("loop");
                    SaveCondition("loop");
                    id++;
                    depth++;
                    // 再帰呼び出しにもsemanticModelを渡す
                    AnalyzeStatements(whileStmt.Statement is BlockSyntax forBlock
                        ? forBlock.Statements
                        : SyntaxFactory.SingletonList(whileStmt.Statement), semanticModel); // semanticModelを渡す
                    depth--;
                    DeleteCondition();
                }
                // 一時的に
                else
                {
                    // その他のステートメントもノードとして追加
                    jsonHandler.addNode(id, "expression", statement.ToString(), depth, currentClassName, currentMethodName, lineNumber);
                    CreateLink("expression");
                    SaveCondition("expression");
                    id++;
                }
            }
        }

        // staticメソッド群は変更なし（SemanticModelを直接使わないため）
        static void SaveCondition(string type)
        {
            if (preId.Count - 1 < depth)
            {
                preId.Add(id);
                preType.Add(type);
            }
            else
            {
                preId[depth] = id;
                preType[depth] = type;
            }
        }

        static void DeleteCondition()
        {
            if (preId.Count - 1 > depth)
            {
                for (int i = preId.Count - 1; i > depth; i--)
                {
                    preId.RemoveAt(i);
                    preType.RemoveAt(i);
                }
            }
        }

        static void CreateLink(string type)
        {
            if (id == 0) return;

            if (preId.Count - 1 == depth)
            {
                jsonHandler.AddLink(preId[depth], id, "normal", currentClassName, currentMethodName);
            }
            else
            {
                if (preType[depth - 1] == "if" || preType[depth - 1] == "else if")
                {
                    if (type == "else if" || isElse)
                    {
                        jsonHandler.AddLink(preId[depth - 1], id, "false", currentClassName, currentMethodName);
                    }
                    else if (type != "else")
                    {
                        jsonHandler.AddLink(preId[depth - 1], id, "true", currentClassName, currentMethodName);
                    }
                }
                else if (preType[depth - 1] == "loop")
                {
                    jsonHandler.AddLink(preId[depth - 1], id, "loop", currentClassName, currentMethodName);
                }
            }
        }
        static string GetArgumentText(InvocationExpressionSyntax invocation)
        {
            if (invocation.ArgumentList == null)
                return "";

            return string.Join(", ",
                invocation.ArgumentList.Arguments
                    .Select(arg => arg.Expression.ToString())
            );
        }
    }
}
